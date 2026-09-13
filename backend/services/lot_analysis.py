"""
Lot-relative normalization: robust (median/MAD) z-scores for each component
against the other components sharing its lot. This is the statistical core
of "within limit != healthy" — a component is compared to its peers, not a
fixed spec.
"""
import numpy as np
import pandas as pd

MAD_SCALE = 1.4826  # scales MAD to be a consistent estimator of std-dev for normal data


def _robust_z(v, m, mad):
    s = mad * MAD_SCALE
    return float((v - m) / s) if s > 1e-9 else 0.0


def add_lot_relative_scores(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    lot_stats = {}
    
    df["lot_rank_percentile"] = df.groupby("lot_id")["v168"].rank(pct=True) * 100.0
    
    for lot, g in df.groupby("lot_id"):
        mean_v = float(g["v168"].mean())
        std_v = float(g["v168"].std(ddof=1)) if len(g) > 1 else 0.5
        if std_v < 1e-4:
            std_v = 0.5
        m_v = float(g["v168"].median())
        mad_v = float((g["v168"] - m_v).abs().median())
        if mad_v < 1e-4:
            mad_v = 0.05
        m_s = float(g["slope"].median())
        mad_s = float((g["slope"] - m_s).abs().median())
        lot_stats[lot] = {
            "mean_v": mean_v,
            "std_v": std_v,
            "m_v": m_v,
            "mad_v": mad_v,
            "m_s": m_s,
            "mad_s": mad_s,
            "n": len(g),
        }

    lot_means, lot_stds, lot_pct_devs = [], [], []
    lot_medians, lot_mads = [], []
    z168, z_slope = [], []
    lot_anomaly_scores = []
    
    for _, row in df.iterrows():
        st = lot_stats[row["lot_id"]]
        z = _robust_z(row["v168"], st["m_v"], st["mad_v"])
        z168.append(z)
        z_slope.append(_robust_z(row["slope"], st["m_s"], st["mad_s"]))
        lot_means.append(st["mean_v"])
        lot_stds.append(st["std_v"])
        lot_medians.append(st["m_v"])
        lot_mads.append(st["mad_v"])
        
        pct_dev = ((row["v168"] - st["mean_v"]) / st["mean_v"] * 100.0) if st["mean_v"] != 0 else 0.0
        lot_pct_devs.append(pct_dev)
        
        anomaly_score = min(100.0, max(0.0, abs(z) * 25.0))
        lot_anomaly_scores.append(anomaly_score)

    df["z168"] = z168
    df["z_slope"] = z_slope
    df["lot_mean"] = lot_means
    df["lot_std"] = lot_stds
    df["lot_median"] = lot_medians
    df["lot_mad"] = lot_mads
    df["lot_pct_dev"] = lot_pct_devs
    df["lot_anomaly_score"] = lot_anomaly_scores
    
    df.attrs["lot_stats"] = lot_stats
    return df
