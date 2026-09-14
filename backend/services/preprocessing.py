"""
ASTRA VIGIL Preprocessing & Dataset Validation Pipeline.

Validates uploaded burn-in screening datasets against space electronics qualification
standards (MIL-STD-883 Method 1005 HTOL / ISRO ESCC screening).
Detects column variations, verifies numeric integrity, checks duplicate component IDs,
validates datasheet limit consistency, and outputs detailed error logs without silently
corrupting data.
"""
import re
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd

COLUMN_SYNONYMS = {
    "component_id": [
        "component_id", "component", "part_id", "comp_id", "id",
        "part_number", "serial_number", "part", "componentid", "partid"
    ],
    "lot_id": [
        "lot_id", "lot", "batch_id", "batch", "lot_number", "wafer_lot",
        "run_id", "lotid", "batchid", "production_lot"
    ],
    "component_type": [
        "component_type", "type", "part_type", "device_type", "family",
        "category", "componenttype", "subsystem_category"
    ],
    "parameter": [
        "parameter", "param", "test_parameter", "measurement_name",
        "test_name", "test", "metric"
    ],
    "unit": [
        "unit", "units", "measurement_unit", "uom"
    ],
    "v0": [
        "value_0h", "value_0h_ua", "0h", "v0", "reading_0h", "t0",
        "value_t0", "val_0h", "burn_in_0h", "pre_burnin", "val0"
    ],
    "v24": [
        "value_24h", "value_24h_ua", "24h", "v24", "reading_24h", "t24",
        "value_t24", "val_24h", "burn_in_24h", "val24"
    ],
    "v96": [
        "value_96h", "value_96h_ua", "96h", "v96", "reading_96h", "t96",
        "value_t96", "val_96h", "burn_in_96h", "val96"
    ],
    "v168": [
        "value_168h", "value_168h_ua", "168h", "v168", "reading_168h", "t168",
        "value_t168", "val_168h", "burn_in_168h", "post_burnin", "val168",
        "value", "measurement"
    ],
    "datasheet_min": [
        "datasheet_min", "spec_min", "min_limit", "lower_spec_limit",
        "lsl", "limit_min", "spec_min_ua", "min_val"
    ],
    "datasheet_max": [
        "datasheet_max", "static_limit_ua", "static_limit", "datasheet_limit",
        "limit", "spec_limit", "upper_spec_limit", "usl", "limit_max",
        "spec_max", "max_limit", "max_val"
    ],
    "temperature_c": [
        "temperature_c", "temperature", "temp_c", "temp", "ambient_temp_c",
        "burn_in_temp_c", "htol_temp", "test_temp_c", "temp_deg_c"
    ],
    "ground_truth": [
        "ground_truth_latent_defect", "ground_truth", "label", "is_defect",
        "defect_label", "latent_defect", "target", "defect"
    ],
}

REQUIRED_FIELDS = ["component_id", "lot_id", "v0", "v24", "v168"]

CANONICAL_FIELD_ALIASES = {
    "value_0h": "v0",
    "value_24h": "v24",
    "value_96h": "v96",
    "value_168h": "v168",
    "spec_min": "datasheet_min",
    "spec_max": "datasheet_max",
    "limit": "datasheet_max",
    "temp": "temperature_c",
    "temperature": "temperature_c",
}


def normalize_mapping_keys(mapping: Dict[str, str]) -> Dict[str, str]:
    """
    Normalizes mapping keys so that expected standard field names
    (e.g., 'value_0h', 'datasheet_max') resolve to internal identifiers ('v0', 'datasheet_max').
    """
    if not mapping:
        return {}
    normalized: Dict[str, str] = {}
    for k, v in mapping.items():
        k_clean = str(k).strip()
        alias_k = CANONICAL_FIELD_ALIASES.get(k_clean.lower(), k_clean)
        normalized[alias_k] = v
    return normalized


def _norm(h: str) -> str:
    h = str(h).lower().strip()
    h = re.sub(r"[^a-z0-9]+", "_", h)
    return h.strip("_")


def auto_detect_mapping(columns: List[str]) -> Dict[str, str]:
    """Return {canonical_field: original_column_name} for matched columns."""
    normed = {_norm(c): c for c in columns}
    mapping: Dict[str, str] = {}
    used_cols = set()

    # Step 1: Exact normalized match
    for field, synonyms in COLUMN_SYNONYMS.items():
        for syn in synonyms:
            syn_norm = _norm(syn)
            if syn_norm in normed and normed[syn_norm] not in used_cols:
                mapping[field] = normed[syn_norm]
                used_cols.add(normed[syn_norm])
                break

    # Step 2: Flexible containment & token match for remaining fields
    for field, synonyms in COLUMN_SYNONYMS.items():
        if field in mapping:
            continue
        for syn in synonyms:
            syn_norm = _norm(syn)
            for n_col, orig_col in normed.items():
                if orig_col in used_cols:
                    continue
                if syn_norm in n_col or n_col in syn_norm:
                    mapping[field] = orig_col
                    used_cols.add(orig_col)
                    break
            if field in mapping:
                break

    # Step 3: Specific common burn-in time patterns (e.g. "0 hr", "24 hr", "168 hr")
    time_patterns = {
        "v0": ["0_hr", "0hr", "0_h", "t_0", "hour_0"],
        "v24": ["24_hr", "24hr", "24_h", "t_24", "hour_24"],
        "v96": ["96_hr", "96hr", "96_h", "t_96", "hour_96"],
        "v168": ["168_hr", "168hr", "168_h", "t_168", "hour_168"],
    }
    for field, patterns in time_patterns.items():
        if field in mapping:
            continue
        for pat in patterns:
            for n_col, orig_col in normed.items():
                if orig_col in used_cols:
                    continue
                if pat in n_col:
                    mapping[field] = orig_col
                    used_cols.add(orig_col)
                    break
            if field in mapping:
                break

    return normalize_mapping_keys(mapping)


def missing_required(mapping: Dict[str, str]) -> List[str]:
    """Identify required fields that have not been mapped."""
    norm_map = normalize_mapping_keys(mapping)
    return [f for f in REQUIRED_FIELDS if f not in norm_map]


def validate_raw_dataset(raw_df: pd.DataFrame, mapping: Dict[str, str]) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Performs multi-dimensional data validation before AI preprocessing:
      1. Empty dataset check
      2. Missing required columns
      3. Null or non-numeric burn-in time point values
      4. Infinite / non-finite reading checks
      5. Duplicate component IDs
      6. Empty or whitespace-only lot IDs
      7. Inconsistent datasheet min/max (min >= max)
      8. Temperature range checks (-55°C to 200°C)
      9. Single component / small cohort warnings

    Returns (is_valid, list_of_issues).
    """
    issues: List[Dict[str, Any]] = []

    if raw_df is None or len(raw_df) == 0:
        issues.append({
            "row": None,
            "column": None,
            "message": "Uploaded dataset is completely empty (0 rows).",
            "severity": "error",
        })
        return False, issues

    mapping = normalize_mapping_keys(mapping)

    # 1. Missing required mapped columns
    missing = missing_required(mapping)
    if missing:
        for m in missing:
            issues.append({
                "row": None,
                "column": m,
                "message": f"Mandatory column '{m}' could not be detected or mapped.",
                "severity": "error",
            })
        return False, issues

    comp_col = mapping["component_id"]
    lot_col = mapping["lot_id"]

    # 2. Duplicate Component IDs Check
    comp_series = raw_df[comp_col].astype(str).str.strip()
    dupe_mask = comp_series.duplicated(keep=False)
    if dupe_mask.any():
        dupe_ids = comp_series[dupe_mask].unique().tolist()
        sample_dupes = dupe_ids[:5]
        dupe_count = len(dupe_ids)
        issues.append({
            "row": None,
            "column": comp_col,
            "message": f"Detected {dupe_count} duplicate component IDs (e.g. {', '.join(sample_dupes)}). Each spaceflight component must have a unique identifier.",
            "severity": "error",
        })

    # 3. Lot ID Validations
    lot_series = raw_df[lot_col].astype(str).str.strip()
    empty_lot_mask = lot_series.isna() | (lot_series == "") | (lot_series.str.lower() == "nan")
    if empty_lot_mask.any():
        bad_rows = raw_df.index[empty_lot_mask].tolist()[:5]
        issues.append({
            "row": bad_rows[0] + 1,
            "column": lot_col,
            "message": f"Found {empty_lot_mask.sum()} components with empty or invalid lot IDs (rows: {bad_rows}). Components must belong to a production lot for relative screening.",
            "severity": "error",
        })

    # 4. Numeric Values Check on Burn-in Hours
    reading_cols = ["v0", "v24", "v168"]
    if "v96" in mapping:
        reading_cols.append("v96")

    for field in reading_cols:
        col = mapping[field]
        numeric_series = pd.to_numeric(raw_df[col], errors="coerce")
        bad_numeric = numeric_series.isna() & raw_df[col].notna()
        if bad_numeric.any():
            bad_idx = raw_df.index[bad_numeric].tolist()[:3]
            issues.append({
                "row": bad_idx[0] + 1,
                "column": col,
                "message": f"Non-numeric values found in '{col}' at rows {[r+1 for r in bad_idx]}.",
                "severity": "error",
            })
        
        # Infinite value check
        inf_mask = np.isinf(numeric_series)
        if inf_mask.any():
            bad_inf = raw_df.index[inf_mask].tolist()[:3]
            issues.append({
                "row": bad_inf[0] + 1,
                "column": col,
                "message": f"Infinite or non-finite measurement values found in '{col}' at rows {[r+1 for r in bad_inf]}.",
                "severity": "error",
            })

        missing_count = numeric_series.isna().sum()
        if missing_count > 0 and field in REQUIRED_FIELDS:
            issues.append({
                "row": None,
                "column": col,
                "message": f"Column '{col}' has {missing_count} missing or NaN values.",
                "severity": "warning" if missing_count < len(raw_df) else "error",
            })

    # 5. Datasheet Min/Max Inversion Check
    has_min = "datasheet_min" in mapping
    has_max = "datasheet_max" in mapping
    if has_min and has_max:
        min_vals = pd.to_numeric(raw_df[mapping["datasheet_min"]], errors="coerce")
        max_vals = pd.to_numeric(raw_df[mapping["datasheet_max"]], errors="coerce")
        inverted = (min_vals.notna()) & (max_vals.notna()) & (min_vals >= max_vals)
        if inverted.any():
            inv_rows = raw_df.index[inverted].tolist()[:3]
            issues.append({
                "row": inv_rows[0] + 1,
                "column": f"{mapping['datasheet_min']} / {mapping['datasheet_max']}",
                "message": f"Datasheet min/max inconsistency: minimum limit exceeds maximum limit at rows {[r+1 for r in inv_rows]}.",
                "severity": "error",
            })

    # 6. Temperature Check (if present)
    if "temperature_c" in mapping:
        temp_col = mapping["temperature_c"]
        temps = pd.to_numeric(raw_df[temp_col], errors="coerce")
        extreme_temp = (temps < -65.0) | (temps > 250.0)
        if extreme_temp.any():
            bad_temp_rows = raw_df.index[extreme_temp].tolist()[:3]
            issues.append({
                "row": bad_temp_rows[0] + 1,
                "column": temp_col,
                "message": f"Extreme or out-of-range HTOL temperature (< -65°C or > 250°C) observed at rows {[r+1 for r in bad_temp_rows]}.",
                "severity": "warning",
            })

    # 7. Single component / small cohort warning
    if len(raw_df) == 1:
        issues.append({
            "row": 1,
            "column": comp_col,
            "message": "Dataset contains only 1 component; lot-relative cohort screening operates best on cohorts (>= 3 components).",
            "severity": "warning",
        })

    # Decide overall validity: errors block, warnings alert
    has_blocking_errors = any(issue["severity"] == "error" for issue in issues)
    return (not has_blocking_errors), issues


def build_dataframe(raw_df: pd.DataFrame, mapping: Dict[str, str]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Transforms and validates raw dataframe using column mapping.
    Produces canonical DataFrame ready for Module A and Module B screening.
    """
    mapping = normalize_mapping_keys(mapping)
    rows = len(raw_df) if raw_df is not None else 0
    is_valid, issues = validate_raw_dataset(raw_df, mapping)

    out = pd.DataFrame()
    out["component_id"] = raw_df[mapping["component_id"]].astype(str).str.strip()
    out["lot_id"] = raw_df[mapping["lot_id"]].astype(str).str.strip()

    # Optional component metadata
    if "component_type" in mapping:
        out["component_type"] = raw_df[mapping["component_type"]].astype(str).str.strip()
    else:
        out["component_type"] = "Integrated Circuit"

    if "parameter" in mapping:
        out["parameter"] = raw_df[mapping["parameter"]].astype(str).str.strip()
    else:
        out["parameter"] = "Leakage Current (µA)"

    if "unit" in mapping:
        out["unit"] = raw_df[mapping["unit"]].astype(str).str.strip()
    else:
        out["unit"] = "µA"

    # Burn-in readings
    out["v0"] = pd.to_numeric(raw_df[mapping["v0"]], errors="coerce")
    out["v24"] = pd.to_numeric(raw_df[mapping["v24"]], errors="coerce")
    out["v96"] = pd.to_numeric(raw_df[mapping["v96"]], errors="coerce") if "v96" in mapping else np.nan
    out["v168"] = pd.to_numeric(raw_df[mapping["v168"]], errors="coerce")

    # Datasheet limits
    if "datasheet_min" in mapping:
        out["datasheet_min"] = pd.to_numeric(raw_df[mapping["datasheet_min"]], errors="coerce").fillna(0.0)
    else:
        out["datasheet_min"] = 0.0

    if "datasheet_max" in mapping:
        out["datasheet_max"] = pd.to_numeric(raw_df[mapping["datasheet_max"]], errors="coerce").fillna(50.0)
    else:
        out["datasheet_max"] = 50.0
    out["limit"] = out["datasheet_max"]

    # Burn-in Temperature
    if "temperature_c" in mapping:
        out["temperature_c"] = pd.to_numeric(raw_df[mapping["temperature_c"]], errors="coerce").fillna(125.0)
    else:
        out["temperature_c"] = 125.0

    # Optional Ground Truth Label
    if "ground_truth" in mapping:
        gt = pd.to_numeric(raw_df[mapping["ground_truth"]], errors="coerce")
        out["ground_truth"] = gt
    else:
        out["ground_truth"] = np.nan

    # Drop non-viable rows (missing essential ID, lot, or readings)
    valid_mask = (
        out["component_id"].notna() & (out["component_id"].str.len() > 0)
        & out["lot_id"].notna() & (out["lot_id"].str.len() > 0)
        & out["v0"].notna() & out["v24"].notna() & out["v168"].notna()
    )

    clean = out[valid_mask].reset_index(drop=True)

    # Drop duplicate component_ids if present (keep first) to prevent primary key / identity conflicts
    clean = clean.drop_duplicates(subset=["component_id"]).reset_index(drop=True)

    meta = {
        "rows": int(rows),
        "valid": int(len(clean)),
        "missing": int(rows - len(clean)),
        "lots": int(clean["lot_id"].nunique()) if len(clean) else 0,
        "has_ground_truth": bool(clean["ground_truth"].notna().any()) if len(clean) else False,
        "is_valid": is_valid,
        "validation_issues": issues,
    }

    return clean, meta
