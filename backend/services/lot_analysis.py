"""
ASTRA VIGIL Module A: Dynamic Lot-Relative Anomaly Detection.

Traditional screening asks: "Is the value inside the static datasheet limit?"
ASTRA VIGIL Module A asks: "Is this component behaving normally relative to its production lot?"

Performs robust statistical screening:
  - Median & Median Absolute Deviation (MAD)
  - Consistent scale estimation (1.4826 * MAD)
  - Robust z-scores (insensitive to extreme outliers)
  - Standard parametric z-scores
  - Percentile ranking within cohort
  - Percentage deviation from lot baseline
  - Identification of latent defects (Traditional PASS, but Lot-Relative ABNORMAL)
"""
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd

MAD_SCALE = 1.4826  # Factor for asymptotic normality of MAD


def _calc_robust_z(val: float, median: float, mad: float) -> float:
    scale = mad * MAD_SCALE
    if scale > 1e-6:
        return float((val - median) / scale)
    return 0.0


def _calc_std_z(val: float, mean: float, std: float) -> float:
    if std > 1e-6:
        return float((val - mean) / std)
    return 0.0


def add_lot_relative_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes dynamic lot-relative statistics and anomaly indicators for all components.
    Attaches detailed cohort metrics and lot summaries to the DataFrame.
    """
    df = df.copy()

    # Determine grouping keys (group by lot_id and component_type if diverse, else lot_id)
    if "component_type" in df.columns and df.groupby(["lot_id", "component_type"]).ngroups > df["lot_id"].nunique():
        group_cols = ["lot_id", "component_type"]
    else:
        group_cols = ["lot_id"]

    lot_stats: Dict[str, Dict[str, Any]] = {}

    # Calculate lot-level statistics per group
    for key, group in df.groupby(group_cols):
        if isinstance(key, tuple):
            lot_id_str = str(key[0])
            c_type_str = str(key[1]) if len(key) > 1 else (str(group["component_type"].iloc[0]) if "component_type" in group.columns else "Integrated Circuit")
        else:
            lot_id_str = str(key)
            c_type_str = str(group["component_type"].iloc[0]) if "component_type" in group.columns else "Integrated Circuit"
        n = len(group)

        v168_vals = group["v168"].to_numpy(dtype=float)
        slope_vals = group["slope"].to_numpy(dtype=float) if "slope" in group.columns else np.zeros(n)

        mean_v = float(np.mean(v168_vals))
        std_v = float(np.std(v168_vals, ddof=1)) if n > 1 else 0.5
        if std_v < 1e-4:
            std_v = 0.5

        med_v = float(np.median(v168_vals))
        mad_v = float(np.median(np.abs(v168_vals - med_v)))
        if mad_v < 1e-4:
            mad_v = 0.05

        med_s = float(np.median(slope_vals))
        mad_s = float(np.median(np.abs(slope_vals - med_s)))
        if mad_s < 1e-4:
            mad_s = 0.005

        min_v = float(np.min(v168_vals))
        max_v = float(np.max(v168_vals))

        stat_key = f"{lot_id_str}::{c_type_str}" if len(group_cols) > 1 else lot_id_str
        lot_stats[stat_key] = {
            "lot_id": lot_id_str,
            "component_type": c_type_str,
            "n": n,
            "mean_v": mean_v,
            "std_v": std_v,
            "med_v": med_v,
            "mad_v": mad_v,
            "med_s": med_s,
            "mad_s": mad_s,
            "min_v": min_v,
            "max_v": max_v,
        }

    # Vectorized / per-row calculation of component deviations
    lot_means = []
    lot_stds = []
    lot_medians = []
    lot_mads = []
    lot_pct_devs = []
    z168_robust = []
    z168_std = []
    z_slope_list = []
    lot_anomaly_scores = []
    is_latent_defects = []
    dev_from_medians = []
    dev_from_means = []
    ds_margins = []
    ds_violated_list = []
    screening_categories = []

    for _, row in df.iterrows():
        lot_id = row["lot_id"]
        c_type = row.get("component_type", "Integrated Circuit")
        stat_key = f"{lot_id}::{c_type}" if len(group_cols) > 1 else lot_id
        st = lot_stats.get(stat_key) or lot_stats.get(lot_id)

        if not st:
            st = {
                "mean_v": row["v168"], "std_v": 0.5,
                "med_v": row["v168"], "mad_v": 0.05,
                "med_s": row.get("slope", 0.0), "mad_s": 0.005,
                "n": 1, "min_v": row["v168"], "max_v": row["v168"],
            }

        v168 = float(row["v168"])
        slope = float(row.get("slope", 0.0))
        ds_min = float(row.get("datasheet_min", 0.0))
        ds_max = float(row.get("datasheet_max", row.get("limit", 50.0)))

        # Robust z-score against lot median/MAD
        z_r = _calc_robust_z(v168, st["med_v"], st["mad_v"])
        # Standard parametric z-score against lot mean/std
        z_s = _calc_std_z(v168, st["mean_v"], st["std_v"])
        # Slope deviation z-score
        z_slope = _calc_robust_z(slope, st["med_s"], st["mad_s"])

        # Percentage deviation from lot median
        if abs(st["med_v"]) > 1e-6:
            pct_dev = ((v168 - st["med_v"]) / st["med_v"]) * 100.0
        else:
            pct_dev = 0.0

        # Anomaly score (0 - 100 scale)
        anomaly_score = min(100.0, max(0.0, abs(z_r) * 22.0 + abs(z_slope) * 6.0))

        # Deviation from lot median and mean
        dev_med = v168 - st["med_v"]
        dev_mean = v168 - st["mean_v"]
        ds_margin = ds_max - v168
        ds_violated = bool((v168 > ds_max) or (v168 < ds_min))

        # Check Traditional Datasheet compliance
        trad_pass = not ds_violated

        # Flag Latent Defect: Passes static spec but is statistically abnormal relative to cohort
        latent = trad_pass and (abs(z_r) >= 3.0 or abs(pct_dev) >= 35.0 or abs(z_slope) >= 3.5)

        # Explicit 4-tier Module A Category
        if ds_violated:
            cat = "DATASHEET_FAILURE"
        elif latent:
            cat = "LATENT_ANOMALY"
        elif abs(z_r) >= 2.0 or abs(pct_dev) >= 20.0:
            cat = "LOT_RELATIVE_ANOMALY"
        else:
            cat = "NORMAL"

        lot_means.append(round(st["mean_v"], 3))
        lot_stds.append(round(st["std_v"], 3))
        lot_medians.append(round(st["med_v"], 3))
        lot_mads.append(round(st["mad_v"], 3))
        lot_pct_devs.append(round(pct_dev, 2))
        z168_robust.append(round(z_r, 3))
        z168_std.append(round(z_s, 3))
        z_slope_list.append(round(z_slope, 3))
        lot_anomaly_scores.append(round(anomaly_score, 1))
        is_latent_defects.append(bool(latent))

        dev_from_medians.append(round(dev_med, 4))
        dev_from_means.append(round(dev_mean, 4))
        ds_margins.append(round(ds_margin, 4))
        ds_violated_list.append(ds_violated)
        screening_categories.append(cat)

    df["lot_mean"] = lot_means
    df["lot_std"] = lot_stds
    df["lot_median"] = lot_medians
    df["lot_mad"] = lot_mads
    df["lot_pct_dev"] = lot_pct_devs
    df["dev_from_lot_median"] = dev_from_medians
    df["dev_from_lot_mean"] = dev_from_means
    df["datasheet_margin"] = ds_margins
    df["datasheet_violated"] = ds_violated_list
    df["lot_screening_category"] = screening_categories
    df["z168"] = z168_robust
    df["robust_z168"] = z168_robust
    df["z168_std"] = z168_std
    df["z_slope"] = z_slope_list
    df["lot_anomaly_score"] = lot_anomaly_scores
    df["is_latent_defect"] = is_latent_defects

    # Rank percentile within each lot cohort
    df["lot_rank_percentile"] = df.groupby(group_cols)["v168"].rank(pct=True).round(4) * 100.0

    df.attrs["lot_stats"] = lot_stats
    return df


def generate_lot_summaries(df: pd.DataFrame) -> list:
    """
    Generates structured summaries for each lot cohort for UI lot exploration.
    """
    summaries = []
    lot_stats = df.attrs.get("lot_stats", {})

    for lot_id, g in df.groupby("lot_id"):
        n = len(g)
        reject_count = int((g["status"] == "reject").sum()) if "status" in g.columns else 0
        monitor_count = int((g["status"] == "monitor").sum()) if "status" in g.columns else 0
        safe_count = int((g["status"] == "safe").sum()) if "status" in g.columns else (n - reject_count - monitor_count)
        latent_count = int(g.get("is_latent_defect", False).sum())

        anomaly_rate = round(((reject_count + monitor_count) / n) * 100.0, 1) if n > 0 else 0.0

        if reject_count > 0 or anomaly_rate > 20.0:
            lot_status = "ELEVATED_RISK"
        elif monitor_count > 0 or anomaly_rate > 10.0:
            lot_status = "CAUTION"
        else:
            lot_status = "NOMINAL"

        med = float(g["lot_median"].iloc[0]) if "lot_median" in g.columns else float(g["v168"].median())
        mad = float(g["lot_mad"].iloc[0]) if "lot_mad" in g.columns else float(np.median(np.abs(g["v168"] - med)))
        mean = float(g["lot_mean"].iloc[0]) if "lot_mean" in g.columns else float(g["v168"].mean())
        std = float(g["lot_std"].iloc[0]) if "lot_std" in g.columns else float(g["v168"].std())

        summaries.append({
            "lot_id": str(lot_id),
            "component_type": str(g["component_type"].iloc[0]) if "component_type" in g.columns else "Integrated Circuit",
            "count": int(n),
            "median": round(med, 2),
            "mad": round(mad, 3),
            "mean": round(mean, 2),
            "std": round(std, 3),
            "min_val": round(float(g["v168"].min()), 2),
            "max_val": round(float(g["v168"].max()), 2),
            "safe_count": safe_count,
            "monitor_count": monitor_count,
            "reject_count": reject_count,
            "latent_defect_count": latent_count,
            "anomaly_rate_pct": anomaly_rate,
            "status": lot_status,
        })

    return summaries
