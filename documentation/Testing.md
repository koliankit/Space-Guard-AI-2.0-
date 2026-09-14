# ASTRA VIGIL — Automated Testing & Quality Assurance

---

## 1. Running the Automated Test Suite

Run the full pytest suite in the `backend/` directory:
```bash
cd backend
..\.venv\Scripts\python.exe -m pytest -v
```

---

## 2. Test Suite Structure

| Test File | Scope / Capabilities Tested |
| :--- | :--- |
| `tests/test_api.py` | Health endpoints, demo generation, batch pipelines, file uploads, bad file rejections |
| `tests/test_auth.py` | PBKDF2 hashing, JWT creation/decoding, login flow, role-based access, audit logging |
| `tests/test_validation.py` | 12-field mapping, numeric validity, duplicate detection, inverted limits, thermal bounds |
| `tests/test_preprocessing_engine.py` | Raw measurement preservation, missing time-point imputation, temporal deltas/slopes |
| `tests/test_module_a.py` | Robust MAD, scale factor 1.4826, robust Z-scores, latent defects, 4-tier categories |
| `tests/test_module_b.py` | Early/late drift velocities, acceleration, 264h+ future mission breach prediction |
| `tests/test_risk_engine.py` | 0 - 100 bounded multi-factor composite risk scores, risk levels, explainability generation |
| `tests/test_edge_cases.py` | Empty CSV, single component, flat zero-variance lots, missing 96h, 500-part stress batches |
| `tests/test_e2e_workflow.py` | Complete end-to-end mission qualification run from login down to report download |

---

## 3. Frontend Type Checking & Production Build
```bash
cd frontend
npm run build
```
Executes `tsc -b && vite build` ensuring 100% type safety and zero compile warnings or missing imports.
