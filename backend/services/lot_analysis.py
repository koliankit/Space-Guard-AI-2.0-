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
    for lot, g in df.groupby("lot_id"):
        mean_v = float(g["v168"].mean())
        std_v = float(g["v168"].std(ddof=1)) if len(g) > 1 else 0.5
        if std_v < 1e-4:
            std_v = 0.5
        m_v = float(g["v168"].median())
        mad_v = float((g["v168"] - m_v).abs().median())
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
    z168, z_slope = [], []
    for _, row in df.iterrows():
        st = lot_stats[row["lot_id"]]
        z168.append(_robust_z(row["v168"], st["m_v"], st["mad_v"]))
        z_slope.append(_robust_z(row["slope"], st["m_s"], st["mad_s"]))
        lot_means.append(st["mean_v"])
        lot_stds.append(st["std_v"])
        pct_dev = ((row["v168"] - st["mean_v"]) / st["mean_v"] * 100.0) if st["mean_v"] != 0 else 0.0
        lot_pct_devs.append(pct_dev)

    df["z168"] = z168
    df["z_slope"] = z_slope
    df["lot_mean"] = lot_means
    df["lot_std"] = lot_stds
    df["lot_pct_dev"] = lot_pct_devs
    df.attrs["lot_stats"] = lot_stats
    return df
