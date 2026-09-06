"""
SPACEGUARD AI backend.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Interactive API docs then live at http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routes import upload, analysis, components, mission, report, demo

app = FastAPI(
    title="SPACEGUARD AI",
    description="AI-driven anomaly detection for spacecraft component burn-in & screening.",
    version="1.0.0",
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


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok", "engine": "SpaceGuard AI reliability engine"}
