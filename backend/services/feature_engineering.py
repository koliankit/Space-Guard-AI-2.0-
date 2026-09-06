"""
Per-component feature engineering from raw burn-in readings.
Pure numpy/pandas — no randomness, everything derived from the data.
"""
import numpy as np
import pandas as pd


def _linreg_predict(xs, ys, x_target):
    xs = np.asarray(xs, dtype=float)
    ys = np.asarray(ys, dtype=float)
    if len(xs) < 2 or np.allclose(xs, xs[0]):
        return float(ys[-1])
    slope, intercept = np.polyfit(xs, ys, 1)
    return float(slope * x_target + intercept)


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["slope"] = (df["v168"] - df["v0"]) / 168.0
    df["drift168"] = df["v168"] - df["v0"]
    df["pct_drift"] = np.where(df["v0"] != 0, df["drift168"] / df["v0"] * 100.0, 0.0)

    predicted168 = []
    for _, row in df.iterrows():
        xs, ys = [0, 24], [row["v0"], row["v24"]]
        if not pd.isna(row.get("v96", np.nan)):
            xs.append(96)
            ys.append(row["v96"])
        predicted168.append(_linreg_predict(xs, ys, 168))
    df["predicted168_from_early"] = predicted168

    # projected value ~96h beyond the last known reading, using the overall drift rate
    df["predicted_future"] = df["v168"] + df["slope"] * 96.0
    return df
