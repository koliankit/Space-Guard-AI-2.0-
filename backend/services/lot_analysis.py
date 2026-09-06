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
        m_v = g["v168"].median()
        mad_v = (g["v168"] - m_v).abs().median()
        m_s = g["slope"].median()
        mad_s = (g["slope"] - m_s).abs().median()
        lot_stats[lot] = {"m_v": m_v, "mad_v": mad_v, "m_s": m_s, "mad_s": mad_s, "n": len(g)}

    z168, z_slope = [], []
    for _, row in df.iterrows():
        st = lot_stats[row["lot_id"]]
        z168.append(_robust_z(row["v168"], st["m_v"], st["mad_v"]))
        z_slope.append(_robust_z(row["slope"], st["m_s"], st["mad_s"]))
    df["z168"] = z168
    df["z_slope"] = z_slope
    df.attrs["lot_stats"] = lot_stats
    return df
