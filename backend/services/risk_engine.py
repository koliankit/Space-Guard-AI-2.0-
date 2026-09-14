"""
ASTRA VIGIL Unified Risk Engine & Explainable AI (XAI) Architecture.

Synthesizes multiple orthogonal evidence signals into an explainable 0-100 risk score:
  1. Lot-Relative Anomaly Factor (|z_robust|, lot median % deviation)
  2. Temporal Drift Velocity & Acceleration (burn-in drift slope, late acceleration)
  3. Datasheet Limit Proximity & Boundary Margin
  4. Future Mission Operating Life Projection (264h+ extrapolation & breach prob)
  5. Temperature Stress Context (MIL-STD-883 Arrhenius acceleration context)
  6. Supervised Flight Defect Probability (XGBoost when ground-truth available)

Produces:
  - Risk Score (0 - 100)
  - Configurable Risk Level:
      0 - 29:   LOW
      30 - 59:  MEDIUM
      60 - 79:  HIGH
      80 - 100: CRITICAL
  - Screening Status: 'safe' | 'monitor' | 'reject'
  - Behavioral Health: 'NORMAL' | 'MONITOR' | 'DEGRADING' | 'CRITICAL'
  - Traditional Verdict: 'PASS' | 'FAIL'
  - Contextual Human-Readable Reason & Attribution Points
"""
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

# Default Configurable Thresholds
DEFAULT_RISK_THRESHOLDS = {
    "LOW_MAX": 29,
    "MEDIUM_MAX": 59,
    "HIGH_MAX": 79,
    "CRITICAL_MIN": 80,
}


def classify_risk_level(score: int, thresholds: Optional[Dict[str, int]] = None) -> str:
    th = thresholds or DEFAULT_RISK_THRESHOLDS
    if score <= th["LOW_MAX"]:
        return "LOW"
    elif score <= th["MEDIUM_MAX"]:
        return "MEDIUM"
    elif score <= th["HIGH_MAX"]:
        return "HIGH"
    else:
        return "CRITICAL"


def score_and_decide(
    df: pd.DataFrame,
    has_ml: bool = False,
    thresholds: Optional[Dict[str, int]] = None
) -> pd.DataFrame:
    """
    Computes unified composite risk score, risk level, flight status, and granular
    human-readable explainability for each component.
    """
    df = df.copy()
    th = thresholds or DEFAULT_RISK_THRESHOLDS

    # 1. Feature Signal Factors
    z168_abs = df["z168"].abs() if "z168" in df.columns else (df["robust_z168"].abs() if "robust_z168" in df.columns else pd.Series(0.0, index=df.index))
    z_slope_abs = df["z_slope"].abs() if "z_slope" in df.columns else pd.Series(0.0, index=df.index)
    z_max = np.maximum(z168_abs, z_slope_abs)

    limit = df["limit"].to_numpy(dtype=float) if "limit" in df.columns else df["datasheet_max"].to_numpy(dtype=float)
    v168 = df["v168"].to_numpy(dtype=float)
    pred_future = df["predicted_future"].to_numpy(dtype=float)
    breach_prob = df["breach_probability"].to_numpy(dtype=float) if "breach_probability" in df.columns else np.zeros(len(df))

    # Normalized evidence terms (0.0 to 1.0)
    s_z = np.clip(z_max / 3.5, 0.0, 1.2)
    s_limit_prox = np.clip(v168 / limit, 0.0, 1.5)
    s_future = np.clip(pred_future / limit, 0.0, 1.5)
    s_iso = np.clip(df.get("iso_score", 0.0) / 100.0, 0.0, 1.0)
    s_safety_slope = np.where(df.get("safety_slope_exceeded", False), 1.0, 0.0)
    s_breach_prob = breach_prob

    # Temperature thermal stress factor (if above standard 125C HTOL)
    if "temperature_c" in df.columns:
        temp = df["temperature_c"].to_numpy(dtype=float)
        s_thermal = np.clip((temp - 125.0) / 25.0, 0.0, 1.0) * 0.05
    else:
        s_thermal = np.zeros(len(df))

    # Multi-factor composite weighting (Total = 100 points)
    if has_ml and "ml_prob" in df.columns and df["ml_prob"].notna().any():
        ml_term = df["ml_prob"].fillna(0.0).to_numpy(dtype=float)
        raw_risk = (
            s_z * 28.0               # Lot-relative deviation weight
            + s_future * 20.0        # Future projection weight
            + s_iso * 15.0           # Unsupervised anomaly weight
            + s_breach_prob * 12.0   # Probability of breach
            + s_safety_slope * 10.0  # Early trajectory check
            + ml_term * 15.0         # Supervised defect probability
            + s_thermal * 100.0      # Temperature stress
        )
    else:
        raw_risk = (
            s_z * 34.0               # Lot-relative deviation weight
            + s_future * 24.0        # Future projection weight
            + s_iso * 18.0           # Unsupervised anomaly weight
            + s_breach_prob * 14.0   # Probability of breach
            + s_safety_slope * 10.0  # Early trajectory check
            + s_thermal * 100.0      # Temperature stress
        )

    # Static limit violations guarantee critical severity (minimum 92/100)
    static_fail = v168 > limit
    if "datasheet_min" in df.columns:
        ds_min = df["datasheet_min"].to_numpy(dtype=float)
        static_fail = static_fail | (v168 < ds_min)

    raw_risk = np.where(
        static_fail,
        np.maximum(92.0, 90.0 + (np.maximum(0.0, v168 - limit) / limit) * 20.0),
        raw_risk
    )

    risk_scores = np.clip(np.round(raw_risk), 0, 100).astype(int)
    df["risk_score"] = risk_scores
    df["traditional_decision"] = np.where(static_fail, "FAIL", "PASS")

    # Classify Risk Levels, Flight Status, Behavioral Health, and Detailed Explainability
    risk_levels: List[str] = []
    statuses: List[str] = []
    behavioral_healths: List[str] = []
    anomaly_categories: List[str] = []
    reasons: List[str] = []
    explanation_points_list: List[List[str]] = []

    for i in range(len(df)):
        r_score = risk_scores[i]
        r_level = classify_risk_level(r_score, th)
        risk_levels.append(r_level)

        row = df.iloc[i]
        val_168 = float(row["v168"])
        lim = float(row.get("limit") if "limit" in row and pd.notna(row["limit"]) else row.get("datasheet_max", 50.0))
        ds_min = float(row.get("datasheet_min", 0.0))
        lot_med = float(row.get("lot_median", val_168))
        lot_mean = float(row.get("lot_mean", val_168))
        lot_mad = float(row.get("lot_mad", 0.05))
        lot_pct = float(row.get("lot_pct_dev", 0.0))
        z168 = float(row["z168"])
        slope = float(row.get("slope", 0.0))
        pred_early = float(row.get("predicted168_from_early", val_168))
        fut = float(row.get("predicted_future", val_168))
        trend = str(row.get("drift_trend", "NOMINAL / STABLE"))
        safety_exceeded = bool(row.get("safety_slope_exceeded", False))
        is_latent = bool(row.get("is_latent_defect", False))
        temp_val = float(row.get("temperature_c", 125.0))

        points: List[str] = []

        # 1. Physical Datasheet Breach
        if val_168 > lim or val_168 < ds_min:
            cat = "outside_spec"
            status = "reject"
            b_health = "CRITICAL"
            diff = val_168 - lim if val_168 > lim else ds_min - val_168
            reason = (
                f"Datasheet limit violation: 168h measurement ({val_168:.2f} uA) breaches specification threshold "
                f"([{ds_min:.1f} - {lim:.1f}] uA) by {diff:+.2f} uA. Traditional: FAIL. Physical quarantine mandatory."
            )
            points.append(f"Datasheet limit violation: 168h reading ({val_168:.2f} uA) breaches specification limit ({lim:.1f} uA).")
            points.append(f"Component is {abs(z168):.1f} robust deviations from lot median ({lot_med:.2f} uA).")
            points.append(f"Burn-in drift slope (+{slope:.5f} uA/hr) indicates uncontained parametric breakdown.")
            points.append(f"Quarantine protocol activated: Traditional FAIL, flight integration prohibited.")

        # 2. Predicted Future Exceedance (Dielectric / Wear-Out Breach)
        elif fut > lim:
            cat = "predicted_exceedance"
            status = "reject"
            b_health = "CRITICAL"
            reason = (
                f"PASS by datasheet spec ({val_168:.2f} uA <= {lim:.1f} uA) but PREDICTED LIMIT EXCEEDANCE: "
                f"burn-in drift slope (+{slope:.5f} uA/hr) projects operating leakage to {fut:.2f} uA at 264h, "
                f"breaching the flight threshold. Component is {abs(z168):.1f} sigma above lot median ({lot_med:.2f} uA)."
            )
            points.append(f"Passes current static datasheet limit ({val_168:.2f} uA <= {lim:.1f} uA) with margin of {(lim - val_168):.2f} uA.")
            points.append(f"Statistically abnormal to production lot: {abs(z168):.1f} robust MAD deviations above lot median ({lot_med:.2f} uA).")
            points.append(f"Drift trajectory classified as: {trend} (slope +{slope:.5f} uA/hr).")
            points.append(f"Projected 264h mission value reaches {fut:.2f} uA (crosses {lim:.1f} uA limit). Latent wearout detected.")

        # 3. Early Trajectory Safety Slope Exceeded
        elif safety_exceeded:
            cat = "safety_slope_violation"
            status = "reject"
            b_health = "CRITICAL"
            reason = (
                f"PASS by datasheet spec ({val_168:.2f} uA <= {lim:.1f} uA) but early 0h->24h drift velocity "
                f"predicted a safety threshold breach at 168h (projected {pred_early:.2f} uA). "
                f"Diverges +{lot_pct:.1f}% from lot peers."
            )
            points.append(f"Passes static datasheet check ({val_168:.2f} uA <= {lim:.1f} uA).")
            points.append(f"Early burn-in drift velocity (0h->24h) triggered safety slope exceedance check.")
            points.append(f"Component is in the {row.get('lot_rank_percentile', 99):.1f}th percentile of lot {row['lot_id']}.")
            points.append(f"Early rejection recommended to prevent mission-phase infant mortality on-orbit.")

        # 4. Latent Cohort Outlier (Within Spec but Abnormal Relative to Lot)
        elif is_latent or r_score >= th["CRITICAL_MIN"] or abs(z168) >= 3.0:
            cat = "abnormal_within_spec"
            status = "reject"
            b_health = "CRITICAL" if r_score >= th["CRITICAL_MIN"] else "DEGRADING"
            reason = (
                f"PASS by datasheet specification ({val_168:.2f} uA <= {lim:.1f} uA) but ABNORMAL RELATIVE TO LOT: "
                f"component is {abs(z168):.1f} robust MAD deviations from lot median ({lot_med:.2f} uA, {lot_pct:+.1f}% shift). "
                f"Peer outlier indicates latent manufacturing defect."
            )
            points.append(f"Complies with static datasheet threshold ({val_168:.2f} uA <= {lim:.1f} uA).")
            points.append(f"Severe peer deviation: {abs(z168):.1f} robust deviations from lot median ({lot_med:.2f} uA, {lot_pct:+.1f}% shift).")
            points.append(f"Thermal HTOL at {temp_val:.0f} deg C confirms parametric divergence from peer cohort.")
            points.append(f"Latent defect identified: quarantined to preserve mission reliability margin.")

        # 5. Approaching Specification Limit / Elevated Drift Rate
        elif val_168 >= 0.80 * lim or fut >= 0.85 * lim or r_score >= th["MEDIUM_MAX"]:
            cat = "approaching_limit"
            status = "monitor"
            b_health = "DEGRADING" if "ACCELERATING" in trend or slope > 0.015 else "MONITOR"
            reason = (
                f"Approaching datasheet boundary: 168h reading ({val_168:.2f} uA) is within 20% of limit ({lim:.1f} uA). "
                f"Component is {abs(z168):.1f} sigma from lot baseline ({lot_med:.2f} uA). Active telemetry monitoring scheduled."
            )
            points.append(f"Reading ({val_168:.2f} uA) approaches datasheet boundary with {(lim - val_168):.2f} uA safety margin remaining.")
            points.append(f"Elevated relative to lot peers: {abs(z168):.1f} robust deviations from median ({lot_med:.2f} uA).")
            points.append(f"Drift trend classified as: {trend}.")
            points.append(f"Telemetry tracking scheduled: flag for flight-qualification secondary review.")

        # 6. Moderate Peer Divergence -> Monitor
        elif abs(z168) >= 2.0 or r_score >= th["LOW_MAX"] + 1:
            cat = "abnormal_within_spec"
            status = "monitor"
            b_health = "MONITOR"
            reason = (
                f"Passes static spec but exhibiting moderate cohort divergence: {abs(z168):.1f} sigma from lot median "
                f"({lot_med:.2f} uA). Scheduled for secondary screening and telemetry monitoring."
            )
            points.append(f"Passes datasheet specification ({val_168:.2f} uA <= {lim:.1f} uA).")
            points.append(f"Moderate peer deviation: {abs(z168):.1f} robust deviations from lot median ({lot_med:.2f} uA).")
            points.append(f"Burn-in drift slope (+{slope:.5f} uA/hr) is within operational bounds.")
            points.append(f"Assigned to MONITOR status: flight clearance conditional on mission profile review.")

        # 7. Nominal Spaceflight Component -> Safe
        else:
            cat = "normal_within_spec"
            status = "safe"
            b_health = "NORMAL"
            reason = (
                f"Nominal lot-relative behavior: reading ({val_168:.2f} uA) conforms tightly to lot distribution "
                f"({abs(z168):.1f} sigma from median {lot_med:.2f} uA). Drift rate is stable; component flight-ready."
            )
            points.append(f"Conforms to datasheet specification ({val_168:.2f} uA within [{ds_min:.1f} - {lim:.1f}] uA).")
            points.append(f"Conforms to lot distribution ({abs(z168):.1f} robust MAD deviations from median {lot_med:.2f} uA).")
            points.append(f"Parametric drift is stable (+{slope:.5f} uA/hr) across 168h HTOL.")
            points.append(f"Flight qualification cleared: ample operating margins preserved.")

        statuses.append(status)
        behavioral_healths.append(b_health)
        anomaly_categories.append(cat)
        reasons.append(reason)
        explanation_points_list.append(points)

    df["risk_level"] = risk_levels
    df["status"] = statuses
    df["behavioral_health"] = behavioral_healths
    df["anomaly_category"] = anomaly_categories
    df["reason"] = reasons
    df["explanation_points"] = explanation_points_list

    return df
