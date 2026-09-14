"""
ASTRA VIGIL Module B: Burn-In Drift Prediction & Trajectory Analysis.

Analyzes temporal component behavior across available burn-in test intervals:
  0h -> 24h -> 96h -> 168h

Capabilities:
  - Absolute drift (delta)
  - Percentage drift
  - Interval rates of change (0-24h, 24-96h, 96-168h, 0-168h)
  - Early-to-Late drift projection (0h + 24h -> predicted 168h)
  - Acceleration & trajectory curvature detection
  - Future operating life projection (264h+ / orbital mission phase)
  - Limit exceedance probability estimation
"""
from typing import List
import numpy as np
import pandas as pd


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes rigorous temporal drift, slope, early prediction, and trajectory
    characteristics for each component record.
    """
    df = df.copy()

    # Default metadata if not set
    if "parameter" not in df.columns or df["parameter"].isna().all():
        df["parameter"] = "Leakage Current (µA)"
    if "unit" not in df.columns or df["unit"].isna().all():
        df["unit"] = "µA"

    v0 = df["v0"].to_numpy(dtype=float)
    v24 = df["v24"].to_numpy(dtype=float)
    v96 = df["v96"].to_numpy(dtype=float) if "v96" in df.columns else np.full(len(df), np.nan)
    v168 = df["v168"].to_numpy(dtype=float)
    limit = df["limit"].to_numpy(dtype=float) if "limit" in df.columns else df["datasheet_max"].to_numpy(dtype=float)

    # 1. Basic Drift Metrics
    drift168 = v168 - v0
    pct_drift = np.where(v0 != 0, (drift168 / np.abs(v0)) * 100.0, 0.0)
    overall_slope = drift168 / 168.0

    df["drift168"] = np.round(drift168, 3)
    df["pct_drift"] = np.round(pct_drift, 2)
    df["slope"] = np.round(overall_slope, 5)

    # 2. Early-Stage Drift & Prediction (0h + 24h -> 168h)
    drift_rate_early = (v24 - v0) / 24.0
    predicted168_early = v0 + drift_rate_early * 168.0
    prediction_error_168 = np.abs(v168 - predicted168_early)

    predicted_drift_168 = predicted168_early - v0
    predicted_drift_rate = predicted_drift_168 / 168.0

    # Safety slope threshold: components whose early drift rate exceeds this are flagged
    safety_slope = np.maximum(0.035, (limit - v0) / 400.0)
    safety_slope_exceeded = predicted_drift_rate > safety_slope

    df["drift_rate_early"] = np.round(drift_rate_early, 5)
    df["predicted168_from_early"] = np.round(predicted168_early, 3)
    df["prediction_error_168"] = np.round(prediction_error_168, 3)
    df["predicted_drift_168"] = np.round(predicted_drift_168, 3)
    df["predicted_drift_rate"] = np.round(predicted_drift_rate, 5)
    df["safety_slope"] = np.round(safety_slope, 5)
    df["safety_slope_exceeded"] = safety_slope_exceeded

    # 3. Late Interval Rate and Acceleration
    has_96 = ~np.isnan(v96)
    late_hours = np.where(has_96, 72.0, 144.0)
    late_start = np.where(has_96, v96, v24)
    drift_rate_late = (v168 - late_start) / late_hours

    acceleration = (drift_rate_late - drift_rate_early) / late_hours

    # 4. Future Projection (at 264h: +96h into orbital mission phase)
    # If accelerating, include quadratic term
    future_hours = 96.0
    accel_term = np.where(acceleration > 0, 0.5 * acceleration * (future_hours ** 2), 0.0)
    predicted_future = v168 + np.maximum(overall_slope, drift_rate_late) * future_hours + accel_term

    margin_168 = limit - v168
    margin_future = limit - predicted_future
    future_limit_breach = predicted_future > limit

    df["predicted_future"] = np.round(predicted_future, 3)
    df["margin_168"] = np.round(margin_168, 3)
    df["margin_future"] = np.round(margin_future, 3)
    df["future_limit_breach"] = future_limit_breach

    # 5. Limit Breach Probability Estimation (0.0 to 1.0)
    # Grounded in distance to limit relative to projected drift velocity
    breach_probs = []
    trends: List[str] = []
    classifications: List[str] = []

    for i in range(len(df)):
        s_e = drift_rate_early[i]
        s_l = drift_rate_late[i]
        s_o = overall_slope[i]
        fut = predicted_future[i]
        lim = limit[i]
        p_err = prediction_error_168[i]

        # Acceleration condition
        is_accel = (s_l > 1.30 * max(0.005, s_e)) and (s_l > 0.015)
        # Deceleration / negative drift
        is_neg = (s_o < -0.005) or (s_l < -0.008)

        if is_accel:
            trend = "ACCELERATING POSITIVE DRIFT"
        elif s_o > 0.012:
            trend = "LINEAR POSITIVE DRIFT"
        elif is_neg:
            trend = "NEGATIVE DRIFT"
        elif p_err > 5.0 and abs(s_e) > 0.02:
            trend = "ABNORMAL TRAJECTORY"
        else:
            trend = "NOMINAL / STABLE"
        trends.append(trend)

        if fut >= lim:
            cls = "PREDICTED LIMIT EXCEEDANCE"
            prob = 1.0
        elif fut >= 0.90 * lim or s_o > 0.035:
            cls = "MONITOR FUTURE TREND"
            prob = min(0.95, max(0.40, (fut - 0.70 * lim) / (0.30 * lim)))
        elif fut >= 0.80 * lim or is_accel:
            cls = "MONITOR FUTURE TREND"
            prob = min(0.50, max(0.20, (fut - 0.60 * lim) / (0.40 * lim)))
        else:
            cls = "SAFE FUTURE TREND"
            prob = max(0.0, min(0.15, (fut - 0.50 * lim) / (0.50 * lim)))

        classifications.append(cls)
        breach_probs.append(round(float(prob), 3))

    df["drift_trend"] = trends
    df["drift_classification"] = classifications
    df["breach_probability"] = breach_probs

    return df
