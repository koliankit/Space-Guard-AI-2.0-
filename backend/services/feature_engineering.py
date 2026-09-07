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
    df["parameter"] = "Leakage Current (µA)"
    df["slope"] = (df["v168"] - df["v0"]) / 168.0
    df["drift168"] = df["v168"] - df["v0"]
    df["pct_drift"] = np.where(df["v0"] != 0, df["drift168"] / df["v0"] * 100.0, 0.0)

    # Module B: SIH26170 requirement: Value_0h + Value_24h -> Predicted Value_168h
    drift_rate_early = (df["v24"] - df["v0"]) / 24.0
    df["drift_rate_early"] = drift_rate_early
    predicted168_early = df["v0"] + drift_rate_early * 168.0
    df["predicted168_from_early"] = predicted168_early
    df["prediction_error_168"] = (df["v168"] - predicted168_early).abs()

    # Future projection at 264h (+96h beyond 168h) using overall measured drift slope
    df["predicted_future"] = df["v168"] + df["slope"] * 96.0

    # Distance from specification limit
    df["margin_168"] = df["limit"] - df["v168"]
    df["margin_future"] = df["limit"] - df["predicted_future"]

    # Classify trend direction
    trends = []
    classifications = []
    for _, row in df.iterrows():
        s_early = row["drift_rate_early"]
        s_late = (row["v168"] - row["v24"]) / 144.0 if 144.0 > 0 else s_early
        s_overall = row["slope"]
        fut = row["predicted_future"]
        lim = row["limit"]

        if s_late > 1.35 * max(0.005, s_early) and s_late > 0.015:
            trend = "ACCELERATING POSITIVE DRIFT"
        elif s_overall > 0.012:
            trend = "LINEAR POSITIVE DRIFT"
        elif s_overall < -0.005:
            trend = "NEGATIVE DRIFT"
        else:
            trend = "NOMINAL / STABLE"
        trends.append(trend)

        if fut > lim:
            cls = "PREDICTED LIMIT EXCEEDANCE"
        elif (lim - fut) < 0.20 * lim or s_overall > 0.025:
            cls = "MONITOR FUTURE TREND"
        else:
            cls = "SAFE FUTURE TREND"
        classifications.append(cls)

    df["drift_trend"] = trends
    df["drift_classification"] = classifications
    return df
