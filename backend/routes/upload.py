import io
import json
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from services import preprocessing, satellite_mapper
from models.orm_models import Batch, ComponentRecord

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload")
@router.post("/screening/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    column_mapping: str = Form(None),  # optional JSON string, sent when the user manually maps columns
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith((".csv", ".tsv", ".txt")):
        raise HTTPException(
            400,
            "Please upload a CSV (or tab-delimited .tsv/.txt) flight screening dataset. "
            "Export Excel sheets to standard CSV format first."
        )

    raw_bytes = await file.read()
    # Check max file size (e.g. 50MB)
    if len(raw_bytes) > 50 * 1024 * 1024:
        raise HTTPException(413, "Uploaded file exceeds maximum authorized size of 50MB.")

    if len(raw_bytes) == 0:
        raise HTTPException(400, "Uploaded file is empty (0 bytes). Please upload a valid CSV flight screening dataset.")

    if b"\x00" in raw_bytes[:4096]:
        raise HTTPException(400, "Binary or corrupt file content detected. Please upload a plain text CSV file.")

    raw_df = None
    parse_exc = None
    for enc in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            raw_df = pd.read_csv(io.BytesIO(raw_bytes), encoding=enc)
            break
        except UnicodeDecodeError:
            continue
        except Exception as e:
            parse_exc = e
            break

    if raw_df is None:
        try:
            raw_df = pd.read_csv(io.BytesIO(raw_bytes), sep=None, engine="python")
        except Exception as e:
            raise HTTPException(400, f"Could not parse file as CSV: {parse_exc or e}")

    if column_mapping:
        try:
            mapping = json.loads(column_mapping)
        except Exception:
            mapping = preprocessing.auto_detect_mapping(raw_df.columns.tolist())
    else:
        mapping = preprocessing.auto_detect_mapping(raw_df.columns.tolist())

    mapping = preprocessing.normalize_mapping_keys(mapping)

    if len(raw_df) == 0:
        return {
            "error": "validation_failed",
            "message": "Uploaded CSV dataset is completely empty (0 rows).",
            "validation_issues": [{
                "row": None,
                "column": None,
                "message": "Uploaded dataset is completely empty (0 rows).",
                "severity": "error",
            }],
            "detected_headers": raw_df.columns.tolist(),
            "auto_mapping": mapping,
            "missing_fields": [],
        }

    missing = preprocessing.missing_required(mapping)
    if missing:
        missing_errors = [{
            "id": f"err-missing-col-{col}",
            "severity": "Critical",
            "errorType": "MISSING_REQUIRED_COLUMN",
            "group": "SCHEMA",
            "stage": "SCHEMA",
            "row": 1,
            "column": col,
            "detectedValue": "Missing from CSV headers",
            "expectedValue": f"Column '{col}'",
            "message": f"Required flight telemetry column '{col}' is missing.",
            "impact": f"Downstream screening calculations depend on '{col}'. AI screening blocked.",
            "recommendedFix": f"Add the '{col}' column to the CSV and upload the corrected file.",
        } for col in missing]

        report = {
            "fileName": file.filename,
            "status": "BLOCKED",
            "totalRows": len(raw_df),
            "validRows": 0,
            "invalidRows": len(raw_df),
            "errorCount": len(missing),
            "criticalCount": len(missing),
            "warningCount": 0,
            "infoCount": 0,
            "dataQualityScore": 0,
            "errors": missing_errors,
            "checks": {
                "formatValid": True,
                "schemaValid": False,
                "requiredColumnsValid": False,
                "rowValidationPassed": False,
                "dataQualityAcceptable": False,
            },
        }

        return {
            "error": "column_mapping_required",
            "message": f"Required flight telemetry columns missing: {', '.join(missing)}. AI screening blocked.",
            "detected_headers": raw_df.columns.tolist(),
            "auto_mapping": mapping,
            "missing_fields": missing,
            "validation_report": report,
            "validation_issues": [{
                "row": None,
                "column": col,
                "message": f"Required column missing: '{col}'",
                "severity": "error",
            } for col in missing],
        }

    clean_df, meta = preprocessing.build_dataframe(raw_df, mapping)

    # If blocking validation errors were found
    if not meta.get("is_valid", True):
        v_report = meta.get("validation_report", {})
        v_report["fileName"] = file.filename
        return {
            "error": "validation_failed",
            "message": "Dataset validation failed. Please review the screening data integrity report below.",
            "validation_issues": meta.get("validation_issues", []),
            "validation_report": v_report,
            "detected_headers": raw_df.columns.tolist(),
            "auto_mapping": mapping,
            "missing_fields": [],
        }

    if meta["valid"] == 0:
        raise HTTPException(400, "No valid component records found after parsing. Please verify columns and numeric readings.")

    clean_df = satellite_mapper.add_subsystem(clean_df)

    v_report = meta.get("validation_report", {})
    v_report["fileName"] = file.filename

    batch = Batch(
        filename=file.filename,
        source="upload",
        rows=meta["rows"],
        valid=meta["valid"],
        missing=meta["missing"],
        lots=meta["lots"],
        has_ground_truth=meta["has_ground_truth"],
        analyzed=False,
        validation_report=v_report,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    records = [
        ComponentRecord(
            batch_id=batch.id,
            component_id=r.component_id,
            lot_id=r.lot_id,
            subsystem=getattr(r, "subsystem", None),
            component_type=getattr(r, "component_type", "Integrated Circuit"),
            parameter=getattr(r, "parameter", "Leakage Current (µA)"),
            unit=getattr(r, "unit", "µA"),
            v0=r.v0,
            v24=r.v24,
            v96=(None if pd.isna(r.v96) else r.v96),
            v168=r.v168,
            datasheet_min=getattr(r, "datasheet_min", 0.0),
            datasheet_max=getattr(r, "datasheet_max", r.limit),
            limit_ua=r.limit,
            temperature_c=getattr(r, "temperature_c", 125.0),
            ground_truth=(None if pd.isna(r.ground_truth) else r.ground_truth),
        )
        for r in clean_df.itertuples()
    ]
    db.bulk_save_objects(records)
    db.commit()

    return {
        "batch_id": batch.id,
        "rows": meta["rows"],
        "valid": meta["valid"],
        "missing": meta["missing"],
        "lots": meta["lots"],
        "has_ground_truth": meta["has_ground_truth"],
        "data_quality_score": meta.get("data_quality_score", 100),
        "columns_detected": mapping,
        "validation_issues": meta.get("validation_issues", []),
        "validation_report": v_report,
    }


@router.post("/validation/export-errors")
def export_validation_errors(issues: list[dict]):
    import csv
    from fastapi.responses import StreamingResponse

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Severity", "Row", "Column", "Issue", "Detected Value", "Expected", "Recommended Fix"])
    for iss in issues:
        writer.writerow([
            iss.get("severity", "Error").capitalize(),
            iss.get("row") if iss.get("row") is not None else "All",
            iss.get("column") or "General",
            iss.get("error_type") or iss.get("message"),
            iss.get("detected_value") or "--",
            iss.get("expected_value") or "--",
            iss.get("how_to_fix") or iss.get("recommendedFix") or iss.get("message"),
        ])
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=validation_error_report.csv"},
    )
