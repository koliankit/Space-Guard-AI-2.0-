"""
SIH26170 Risk Engine & Explainable AI Module:
Combines fixed-limit status, lot-relative z-scores, percentage deviation,
early drift rate (0h+24h), projected future margin, and unsupervised anomaly
score into an explainable 0-100 risk score and flight screening verdict.
"""
import numpy as np
import pandas as pd

Z_REJECT = 3.0
Z_MONITOR = 2.0


def score_and_decide(df: pd.DataFrame, has_ml: bool) -> pd.DataFrame:
    df = df.copy()

    # Feature factors
    z_max = np.maximum(df["z168"].abs(), df["z_slope"].abs())
    s_limit = np.clip(df["v168"] / df["limit"], 0.0, 1.5)
    s_z = np.clip(z_max / 4.0, 0.0, 1.0)
    s_future = np.clip(df["predicted_future"] / df["limit"], 0.0, 1.5)
    s_iso = np.clip(df.get("iso_score", 0.0) / 100.0, 0.0, 1.0)

    # Multi-factor composite risk formula (0-100)
    if has_ml and "ml_prob" in df.columns and df["ml_prob"].notna().any():
        risk = (
            s_z * 35.0
            + s_future * 25.0
            + s_iso * 15.0
            + s_limit * 10.0
            + df["ml_prob"].fillna(0.0) * 15.0
        ) * 100.0 / 100.0
    else:
        risk = (
            s_z * 40.0
            + s_future * 30.0
            + s_iso * 18.0
            + s_limit * 12.0
        )

    # If exceeding static limit, risk is minimum 90
    static_fail = df["v168"] > df["limit"]
    risk = np.where(static_fail, np.maximum(92.0, 90.0 + (df["v168"] - df["limit"]) / df["limit"] * 20.0), risk)
    df["risk_score"] = risk.clip(0, 100).round().astype(int)

    df["traditional_decision"] = np.where(static_fail, "FAIL", "PASS")

    statuses = []
    anomaly_categories = []
    reasons = []

    for i, row in df.iterrows():
        v168 = row["v168"]
        limit = row["limit"]
        lot_mean = row.get("lot_mean", v168)
        z168 = row["z168"]
        slope = row["slope"]
        pred_future = row["predicted_future"]
        zm = z_max.iloc[i]
        r_score = df["risk_score"].iloc[i]

        # 5 Anomaly Categories:
        if v168 > limit:
            cat = "outside_spec"
            status = "reject"
            reason = (
                f"Static datasheet limit violation: 168h leakage ({v168:.2f} µA) exceeds specification threshold "
                f"({limit:.0f} µA) by +{(v168 - limit):.2f} µA. Traditional: FAIL. Immediate quarantine required."
            )
        elif pred_future > limit:
            cat = "predicted_exceedance"
            status = "reject"
            reason = (
                f"Within datasheet limit ({v168:.2f} µA < {limit:.0f} µA) but {abs(z168):.1f}σ above lot average "
                f"({lot_mean:.2f} µA). Measured drift rate (+{slope:.4f} µA/hr) projects 264h leakage to {pred_future:.2f} µA, "
                f"exceeding the safety threshold. Latent dielectric breakdown detected."
            )
        elif zm >= Z_REJECT or r_score >= 75:
            cat = "abnormal_within_spec"
            status = "reject"
            reason = (
                f"PASS by specification ({v168:.2f} µA < {limit:.0f} µA) but ABNORMAL RELATIVE TO LOT: component is "
                f"{abs(z168):.1f}σ from lot mean ({lot_mean:.2f} µA). Peer deviation indicates abnormal degradation rate."
            )
        elif v168 > 0.80 * limit or pred_future > 0.90 * limit:
            cat = "approaching_limit"
            status = "monitor"
            reason = (
                f"Approaching specification limit: reading ({v168:.2f} µA) is within 20% of datasheet limit ({limit:.0f} µA). "
                f"{abs(z168):.1f}σ from lot baseline ({lot_mean:.2f} µA). Scheduled for active in-flight telemetry monitoring."
            )
        elif zm >= Z_MONITOR or r_score >= 40:
            cat = "abnormal_within_spec"
            status = "monitor"
            reason = (
                f"PASS by specification but trending abnormal: {abs(z168):.1f}σ deviation from lot mean ({lot_mean:.2f} µA). "
                f"Drift slope (+{slope:.4f} µA/hr) exceeds normal lot baseline; flagged for monitoring."
            )
        else:
            cat = "normal_within_spec"
            status = "safe"
            reason = (
                f"Normal and within specification: reading ({v168:.2f} µA) is within nominal lot distribution "
                f"({abs(z168):.1f}σ from lot mean {lot_mean:.2f} µA). Drift rate is stable; component flight-ready."
            )

        statuses.append(status)
        anomaly_categories.append(cat)
        reasons.append(reason)

    df["status"] = statuses
    df["anomaly_category"] = anomaly_categories
    df["reason"] = reasons
    return df
