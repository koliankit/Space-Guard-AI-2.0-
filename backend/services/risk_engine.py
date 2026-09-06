"""
Combines the robust z-scores, isolation-forest score, and (if available)
the supervised defect probability into a single 0-100 risk score and a
SAFE / MONITOR / REJECT screening decision, plus a human-readable reason.
"""
import numpy as np
import pandas as pd

Z_REJECT = 3.0
Z_MONITOR = 2.0


def score_and_decide(df: pd.DataFrame, has_ml: bool) -> pd.DataFrame:
    df = df.copy()
    z_max = np.maximum(df["z168"].abs(), df["z_slope"].abs())
    proximity = np.clip(df["predicted_future"] / df["limit"], 0, 1.3) / 1.3

    if has_ml and "ml_prob" in df.columns:
        risk = (z_max / 4.0) * 45 + proximity * 25 + df["ml_prob"] * 30
    else:
        risk = (z_max / 4.0) * 68 + proximity * 32
    df["risk_score"] = risk.clip(0, 100).round().astype(int)

    df["traditional_decision"] = np.where(df["v168"] > df["limit"], "FAIL", "PASS")

    statuses, reasons = [], []
    for i, row in df.iterrows():
        zm = z_max.iloc[i]
        if row["v168"] > row["limit"]:
            statuses.append("reject")
            reasons.append(
                f"168h reading ({row['v168']:.2f}\u00b5A) exceeds the datasheet limit ({row['limit']:.0f}\u00b5A)."
            )
        elif zm > Z_REJECT or row["predicted_future"] > row["limit"]:
            statuses.append("reject")
            reasons.append(
                f"Within the datasheet limit but {abs(row['z168']):.1f}\u03c3 from its lot's baseline, and its "
                f"drift rate is projected to reach {row['predicted_future']:.1f}\u00b5A \u2014 a latent defect a "
                f"fixed-limit check alone would miss."
            )
        elif zm >= Z_MONITOR or df["risk_score"].iloc[i] >= 40:
            statuses.append("monitor")
            reasons.append(f"{abs(row['z168']):.1f}\u03c3 from its lot's baseline \u2014 trending abnormal, not yet over threshold.")
        else:
            statuses.append("safe")
            reasons.append(f"Within {abs(row['z168']):.1f}\u03c3 of its lot's baseline; drift rate normal.")
    df["status"] = statuses
    df["reason"] = reasons
    return df
