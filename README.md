# SPACEGUARD AI

**AI-Driven Anomaly Detection in Component Burn-In & Screening**
Real-Time Intelligent Reliability Monitoring for Spacecraft Components — a Smart India Hackathon prototype.
*ISRO-inspired visual language — this is not an official ISRO system.*

Traditional screening asks *"is the component inside the datasheet limit?"*
SpaceGuard AI asks *"is the component behaving normally relative to its own production lot?"* — catching
latent defects that stay within spec but drift abnormally.

```
UPLOAD → VALIDATE → FEATURE ENGINEERING → LOT-RELATIVE NORMALIZATION
       → ANOMALY DETECTION → DRIFT PREDICTION → RISK SCORING
       → SCREENING DECISION → SATELLITE LOCALIZATION
```

---

## What's actually inside

This is a real two-service app, not a mockup:

- **`backend/`** — FastAPI + SQLite (SQLAlchemy). Parses uploaded burn-in CSVs, computes lot-relative
  robust z-scores (median/MAD) and drift-rate projections with pandas/numpy, runs a scikit-learn
  **Isolation Forest** for unsupervised anomaly scoring, and — *if* the uploaded data carries a ground-truth
  defect label column — also trains a supervised **XGBoost** classifier (falls back to scikit-learn's
  `GradientBoostingClassifier` automatically if `xgboost` isn't installed) and blends its output into the
  final risk score. Everything is persisted to a SQLite database per upload "batch".
- **`frontend/`** — React + TypeScript + Vite + Tailwind + **react-three-fiber** (Three.js). A 3D satellite
  with 11 named, clickable subsystems that light up green/orange/red from the *real* API response — nothing
  in the UI is hardcoded or randomly generated.

**Honest caveat on the ML:** with a batch of a few hundred rows and no held-out test split, the supervised
model is *indicative*, not a validated production classifier — that caveat is returned by the API
(`ml_meta.caveat`) alongside every trained-model result rather than hidden.

---

## Project layout

```
spaceguard-ai/
├── docker-compose.yml
├── backend/
│   ├── main.py                  FastAPI app, CORS, router registration
│   ├── database.py              SQLAlchemy engine/session (SQLite by default)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── data/demo_dataset.csv    a sample dataset (also generated fresh by /api/demo)
│   ├── models/
│   │   ├── orm_models.py        Batch, ComponentRecord tables
│   │   └── schema.py            Pydantic response models
│   ├── routes/
│   │   ├── upload.py            POST /api/upload
│   │   ├── analysis.py          POST /api/analyze/{batch_id}
│   │   ├── components.py        GET  /api/components/{batch_id}[/...]
│   │   ├── mission.py           GET  /api/mission-status/{batch_id}
│   │   ├── report.py            GET  /api/report/{batch_id}  (CSV download)
│   │   └── demo.py              POST /api/demo
│   └── services/
│       ├── preprocessing.py     column auto-detection + validation
│       ├── feature_engineering.py   drift/slope/regression features
│       ├── lot_analysis.py      robust (median/MAD) lot-relative z-scores
│       ├── anomaly_detector.py  Isolation Forest + optional XGBoost
│       ├── risk_engine.py       risk score + SAFE/MONITOR/REJECT decision
│       ├── satellite_mapper.py  component → satellite subsystem mapping
│       ├── demo_generator.py    synthetic "Mission Demo" dataset
│       └── pipeline.py          orchestrates the full pipeline + persistence
└── frontend/
    ├── src/
    │   ├── App.tsx               top-level state + wiring
    │   ├── api.ts                fetch calls to every backend endpoint
    │   ├── types/                TypeScript interfaces matching the API
    │   └── components/
    │       ├── Satellite/        the 3D satellite scene (react-three-fiber)
    │       ├── Dashboard/        header, upload bar, health bar, pipeline overlay, audit log, mapping modal
    │       ├── ComponentPanel/   left component monitor + right intelligence panel
    │       ├── Charts/           traditional-vs-AI compare panel, telemetry chart, data quality
    │       ├── MissionMap/       stylized ground-station/telemetry map
    │       └── Alerts/           critical anomaly modal
    └── package.json
```

---

## Run it locally

### Option A — Docker Compose (easiest)

```bash
docker compose up --build
```
- Backend: http://localhost:8000 (interactive API docs at `/docs`)
- Frontend: http://localhost:5173

### Option B — run each service yourself

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
This creates `spaceguard.db` (SQLite) in `backend/` on first run — nothing else to configure.
If `xgboost` fails to install on your platform, just delete it from `requirements.txt`; the code
automatically falls back to scikit-learn.

**Frontend** (separate terminal):
```bash
cd frontend
cp .env.example .env        # defaults to http://localhost:8000
npm install
npm run dev
```
Open http://localhost:5173. Click **Mission Demo** for the ~10-second scripted walkthrough (uploads a
synthetic dataset, runs the pipeline, and auto-focuses the satellite on the flagged `COMP-FC-03` component,
matching the brief's example exactly), or drag in your own burn-in CSV.

---

## CSV format

Expected columns (auto-detected by name, with common synonyms recognized — e.g. `component`/`part_id` for
`component_id`, `0h`/`v0`/`reading_0h` for the 0h reading, etc.):

| Field | Required | Notes |
|---|---|---|
| `component_id` | yes | |
| `lot_id` | yes | components are compared against others in the same lot |
| `value_0h_uA`, `value_24h_uA`, `value_168h_uA` | yes | burn-in readings |
| `value_96h_uA` | no | improves the early-stage drift prediction if present |
| `static_limit_uA` | no | defaults to 50 if omitted |
| `ground_truth_latent_defect` | no | 0/1 label — enables the supervised model when present |

If the uploaded file's headers can't be confidently matched, the UI opens a column-mapping dialog instead of
guessing silently.

---

## API reference (also live at `/docs` via Swagger UI)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/upload` | Upload a CSV, get back a `batch_id` (or a mapping request) |
| POST | `/api/demo` | Generate + load the synthetic Mission Demo dataset |
| POST | `/api/analyze/{batch_id}` | Run the full DETECT→DECIDE pipeline |
| GET | `/api/components/{batch_id}` | List components (filter by `status`, `search`, `subsystem`) |
| GET | `/api/components/{batch_id}/{component_id}` | Full detail for one component |
| GET | `/api/mission-status/{batch_id}` | Per-subsystem status rollup (drives the satellite colors) |
| GET | `/api/report/{batch_id}` | Download a CSV of all flagged components |

---

## Deploying it for real

**Backend** — any host that runs a Python/uvicorn process works (Render, Railway, Fly.io, an EC2/VM, etc.):
1. Point it at the `backend/` folder (or use `backend/Dockerfile` directly).
2. Set `DATABASE_URL` if you want Postgres instead of the default SQLite file — the code only reads that
   one environment variable to decide (see `database.py`); no other changes needed.
3. Note the public URL it gives you (e.g. `https://spaceguard-api.onrender.com`).

**Frontend** — any static host (Vercel, Netlify, Cloudflare Pages, or the included `frontend/Dockerfile` +
nginx):
1. Set the environment variable `VITE_API_BASE_URL` to your deployed backend URL from above.
2. Build: `npm run build` → deploy the `dist/` folder (or build the Docker image with
   `--build-arg VITE_API_BASE_URL=https://your-backend-url`).

**Before going further than a demo:** tighten `allow_origins=["*"]` in `backend/main.py` to your exact
frontend origin, and swap SQLite for Postgres if you expect concurrent users.

---

## Design notes / honest scoping

- **Component → satellite mapping.** A real burn-in dataset can have hundreds of individual components but
  a satellite only has a handful of physical subsystem locations. Each `component_id` is deterministically
  assigned to one of 11 named subsystems (stable hash, so re-analyzing the same file gives the same
  mapping); the brief's named examples (`COMP-FC-03`, `COMP-PWR-01`, etc.) are hard-mapped to their obvious
  subsystem so the flagship demo always lands correctly. A subsystem marker shows the worst-status component
  assigned to it; every individual component's full result is still available in the list/detail/report
  views.
- **The ML is real but scoped honestly.** Isolation Forest always runs. The supervised model only trains
  when the upload includes a genuine label column with both classes present, and its result is returned with
  an explicit "no held-out test set" caveat rather than presented as validated.
- **No ads, no telemetry, no external calls beyond your own backend** — the frontend only ever talks to the
  `VITE_API_BASE_URL` you configure.

---

## TEE Security Layer

### What is TEE?
A **Trusted Execution Environment (TEE)** is a hardware-enforced, isolated execution boundary provided by modern CPUs (such as Intel SGX, AMD SEV, AWS Nitro Enclaves, or GCP Confidential Computing VMs). It protects sensitive application code and memory contents from unauthorized access or alteration, even from privileged host operating systems, hypervisors, and unauthorized administrators.

### Why SpaceGuard AI Uses TEE
Spaceflight component qualification involves high-stakes decision-making for multi-million-dollar space assets. In distributed, multi-tenant cloud environments or edge testing facilities, mission engineers must be confident that:
1. Proprietary anomaly scoring coefficients and multi-factor weighting schemes remain confidential.
2. Screening thresholds and flight qualification verdicts (`SAFE`, `MONITOR`, `REJECT`) cannot be maliciously tampered with during execution.
3. Every qualification clearance verdict includes a tamper-evident cryptographic attestation proof linking the input burn-in measurements to the final decision.

### What Computations Are Protected
The TEE boundary encapsulates selected sensitive operations:
- **Proprietary Risk Weightings**: The composite risk weighting terms combining lot-relative deviations, drift acceleration, boundary proximity, and temperature stress.
- **Flight Qualification Decision Logic**: The threshold evaluations determining `SAFE`, `MONITOR`, and `REJECT` quarantine verdicts.
- **Inference Verification**: Integrity validation of upstream AI models (Isolation Forest and XGBoost predictions).
- **Cryptographic Attestation**: Generation of HMAC-SHA256 digests and signed execution proofs.

### Why TEE is Strictly an Optional Layer
TEE is a **defense-in-depth security and deployment layer**, **NOT** an AI algorithm or statistical replacement:
- If `TEE_ENABLED=false`: The SpaceGuard AI pipeline (Module A lot-relative normalization, Module B temporal drift prediction, risk engine, and 3D satellite localization) operates normally without degradation.
- If `TEE_ENABLED=true`: The sensitive computation is routed through the TEE boundary.
- If TEE is unavailable: A configurable fallback policy (`TEE_FALLBACK_ALLOWED=true`) ensures continuous operation without crashing, while explicitly logging that fallback mode was used and never falsely claiming hardware protection.

### Simulation / Development Mode vs. Production Deployment
- **Local Development / Simulation Mode (`TEE_MODE=simulation`)**:
  Simulates the enclave perimeter in software so engineers can test and verify TEE integrations on standard developer laptops without specialized confidential computing hardware.
  *Important Note*: The system and UI clearly label this as `● TEE SIMULATION` (`hardware_backed: false`) and never claim hardware security when running in software emulation.
- **Production Hardware Enclave (`TEE_MODE=production`)**:
  Deploys the protected service inside a hardware-isolated confidential computing environment (e.g. AMD SEV-SNP or AWS Nitro Enclave), validating cryptographic attestation measurements before authorizing screening operations.

### Engineering Limitations & Realistic Scope
- **No Absolute Guarantee**: TEE memory isolation does not make an application immune to all security risks. It does not prevent algorithmic flaws in model training, side-channel attacks, or malicious physical tampering with hardware.
- **Data Quality Independence**: TEE protects computation confidentiality and execution integrity; it does not replace empirical burn-in data verification or MIL-STD-883 screening standards.
- **Attestation Scope**: Attestation proves code integrity within the enclave boundary at execution time, but does not guarantee the trustworthiness of external network inputs prior to ingestion.

