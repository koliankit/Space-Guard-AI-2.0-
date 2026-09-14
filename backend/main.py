"""
ASTRA VIGIL backend.
AI-Driven Anomaly Detection in Component Burn-In & Screening
(ISRO / Aerospace Component Qualification & Reliability)

Run locally:
    uvicorn main:app --reload --port 8000

Interactive API docs live at http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, SessionLocal
from routes import upload, analysis, components, mission, report, demo, auth
from services.auth import init_default_users

app = FastAPI(
    title="ASTRA VIGIL",
    description="AI-Driven Anomaly Detection in Component Burn-In & Screening for Space Electronics and Flight Qualification.",
    version="2.5.0",
)

# In production, replace "*" with your deployed frontend's exact origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(analysis.router)
app.include_router(components.router)
app.include_router(mission.router)
app.include_router(report.router)
app.include_router(demo.router)
app.include_router(auth.router)


@app.on_event("startup")
def on_startup():
    init_db()
    with SessionLocal() as db:
        init_default_users(db)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "system": "ASTRA VIGIL",
        "engine": "ASTRA VIGIL AI Reliability Screening Engine",
        "version": "2.5.0",
        "domain": "ISRO Aerospace / Space Electronics Screening"
    }
