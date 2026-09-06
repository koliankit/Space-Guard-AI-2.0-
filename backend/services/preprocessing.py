"""
Column auto-detection and dataframe validation for uploaded burn-in datasets.
"""
import re
import pandas as pd
import numpy as np

COLUMN_SYNONYMS = {
    "component_id": ["component_id", "component", "part_id", "comp_id", "id"],
    "lot_id": ["lot_id", "lot", "batch_id", "batch"],
    "v0": ["value_0h_ua", "value_0h", "0h", "v0", "reading_0h"],
    "v24": ["value_24h_ua", "value_24h", "24h", "v24", "reading_24h"],
    "v96": ["value_96h_ua", "value_96h", "96h", "v96", "reading_96h"],
    "v168": ["value_168h_ua", "value_168h", "168h", "v168", "reading_168h", "value", "measurement"],
    "limit": ["static_limit_ua", "static_limit", "datasheet_limit", "limit", "spec_limit"],
    "ground_truth": ["ground_truth_latent_defect", "ground_truth", "label", "is_defect"],
}
REQUIRED_FIELDS = ["component_id", "lot_id", "v0", "v24", "v168"]


def _norm(h: str) -> str:
    h = h.lower().strip()
    h = re.sub(r"[^a-z0-9]+", "_", h)
    return h.strip("_")


def auto_detect_mapping(columns):
    """Return {field: original_column_name} for whichever fields it can confidently match."""
    normed = {_norm(c): c for c in columns}
    mapping = {}
    for field, synonyms in COLUMN_SYNONYMS.items():
        for syn in synonyms:
            if syn in normed:
                mapping[field] = normed[syn]
                break
    return mapping


def missing_required(mapping):
    return [f for f in REQUIRED_FIELDS if f not in mapping]


def build_dataframe(raw_df: pd.DataFrame, mapping: dict):
    """
    Given a raw dataframe and a column mapping, produce a clean, validated
    dataframe with canonical column names. Returns (clean_df, meta).
    Rows with missing/invalid required fields are dropped (counted in meta).
    """
    rows = len(raw_df)
    out = pd.DataFrame()
    out["component_id"] = raw_df[mapping["component_id"]].astype(str)
    out["lot_id"] = raw_df[mapping["lot_id"]].astype(str)
    out["v0"] = pd.to_numeric(raw_df[mapping["v0"]], errors="coerce")
    out["v24"] = pd.to_numeric(raw_df[mapping["v24"]], errors="coerce")
    out["v96"] = pd.to_numeric(raw_df[mapping["v96"]], errors="coerce") if "v96" in mapping else np.nan
    out["v168"] = pd.to_numeric(raw_df[mapping["v168"]], errors="coerce")
    if "limit" in mapping:
        out["limit"] = pd.to_numeric(raw_df[mapping["limit"]], errors="coerce").fillna(50.0)
    else:
        out["limit"] = 50.0
    if "ground_truth" in mapping:
        gt = pd.to_numeric(raw_df[mapping["ground_truth"]], errors="coerce")
        out["ground_truth"] = gt
    else:
        out["ground_truth"] = np.nan

    valid_mask = (
        out["component_id"].notna() & (out["component_id"].str.len() > 0)
        & out["lot_id"].notna() & (out["lot_id"].str.len() > 0)
        & out["v0"].notna() & out["v24"].notna() & out["v168"].notna()
    )
    clean = out[valid_mask].reset_index(drop=True)
    meta = {
        "rows": int(rows),
        "valid": int(len(clean)),
        "missing": int(rows - len(clean)),
        "lots": int(clean["lot_id"].nunique()) if len(clean) else 0,
        "has_ground_truth": bool(clean["ground_truth"].notna().any()) if len(clean) else False,
    }
    return clean, meta
