from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.orm_models import Batch, ComponentRecord
from services.satellite_mapper import SUBSYSTEMS

router = APIRouter(prefix="/api", tags=["mission"])

STATUS_RANK = {"safe": 0, "monitor": 1, "reject": 2}


@router.get("/mission-status/{batch_id}")
def mission_status(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(404, "Batch not found.")
    rows = db.query(ComponentRecord).filter(ComponentRecord.batch_id == batch_id).all()

    safe = sum(1 for r in rows if r.status == "safe")
    monitor = sum(1 for r in rows if r.status == "monitor")
    reject = sum(1 for r in rows if r.status == "reject")
    mission_health = int(round(100 - (sum(r.risk_score or 0 for r in rows) / len(rows)))) if rows else 100

    subsystems = []
    for s in SUBSYSTEMS:
        items = [r for r in rows if r.subsystem == s["key"]]
        if not items:
            subsystems.append({
                "key": s["key"], "name": s["name"], "position": s["pos"],
                "count": 0, "status": "idle", "avg_risk": 0.0, "top_component": None,
            })
            continue
        worst = max(items, key=lambda r: STATUS_RANK.get(r.status, -1))
        avg_risk = sum(r.risk_score or 0 for r in items) / len(items)
        top = max(items, key=lambda r: r.risk_score or 0)
        subsystems.append({
            "key": s["key"], "name": s["name"], "position": s["pos"],
            "count": len(items), "status": worst.status, "avg_risk": round(avg_risk, 1),
            "top_component": top.component_id,
        })

    return {
        "batch_id": batch_id, "mission_health": max(0, min(100, mission_health)),
        "safe": safe, "monitor": monitor, "reject": reject, "subsystems": subsystems,
    }
