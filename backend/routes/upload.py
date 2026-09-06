import io
import json
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from services import preprocessing
from models.orm_models import Batch

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    column_mapping: str = Form(None),  # optional JSON string, sent when the user manually maps columns
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith((".csv", ".tsv", ".txt")):
        raise HTTPException(400, "Please upload a CSV (or tab-delimited .tsv/.txt) file. "
                                  "Export XLSX to CSV first — openpyxl can be added to requirements.txt "
                                  "if you'd rather upload .xlsx directly.")
    raw_bytes = await file.read()
    try:
        raw_df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception as e:
        raise HTTPException(400, f"Could not parse file as CSV: {e}")

    if column_mapping:
        mapping = json.loads(column_mapping)
    else:
        mapping = preprocessing.auto_detect_mapping(raw_df.columns.tolist())

    missing = preprocessing.missing_required(mapping)
    if missing:
        return {
            "error": "column_mapping_required",
            "detected_headers": raw_df.columns.tolist(),
            "auto_mapping": mapping,
            "missing_fields": missing,
        }

    clean_df, meta = preprocessing.build_dataframe(raw_df, mapping)
    if meta["valid"] == 0:
        raise HTTPException(400, "No valid rows found after mapping — please check the column mapping.")

    batch = Batch(
        filename=file.filename, source="upload",
        rows=meta["rows"], valid=meta["valid"], missing=meta["missing"],
        lots=meta["lots"], has_ground_truth=meta["has_ground_truth"], analyzed=False,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # stash the cleaned rows temporarily as JSON on the batch row's own table is avoided;
    # instead we persist raw components immediately (undecided fields filled on /analyze)
    from models.orm_models import ComponentRecord
    records = [
        ComponentRecord(
            batch_id=batch.id, component_id=r.component_id, lot_id=r.lot_id,
            v0=r.v0, v24=r.v24, v96=(None if pd.isna(r.v96) else r.v96), v168=r.v168,
            limit_ua=r.limit, ground_truth=(None if pd.isna(r.ground_truth) else r.ground_truth),
        )
        for r in clean_df.itertuples()
    ]
    db.bulk_save_objects(records)
    db.commit()

    return {
        "batch_id": batch.id,
        "rows": meta["rows"], "valid": meta["valid"], "missing": meta["missing"],
        "lots": meta["lots"], "has_ground_truth": meta["has_ground_truth"],
        "columns_detected": mapping,
    }
