import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from services import demo_generator, preprocessing, satellite_mapper
from models.orm_models import Batch, ComponentRecord

router = APIRouter(prefix="/api", tags=["demo"])


@router.post("/demo")
def create_demo_batch(db: Session = Depends(get_db)):
    raw_df = demo_generator.generate()
    mapping = preprocessing.auto_detect_mapping(raw_df.columns.tolist())
    clean_df, meta = preprocessing.build_dataframe(raw_df, mapping)

    batch = Batch(
        filename="mission_demo.csv", source="demo",
        rows=meta["rows"], valid=meta["valid"], missing=meta["missing"],
        lots=meta["lots"], has_ground_truth=meta["has_ground_truth"], analyzed=False,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    clean_df = satellite_mapper.add_subsystem(clean_df)

    records = [
        ComponentRecord(
            batch_id=batch.id,
            component_id=r.component_id,
            lot_id=r.lot_id,
            subsystem=getattr(r, "subsystem", None),
            component_type=getattr(r, "component_type", "Space-Grade Microcircuit"),
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
    }
