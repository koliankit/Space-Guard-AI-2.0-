# ASTRA VIGIL — REST API Specification

Interactive Swagger / OpenAPI UI is accessible at: `http://localhost:8000/docs`

---

## 1. Authentication & RBAC

### `POST /api/auth/login`
Authenticates flight qualification personnel and generates a JWT session token.
- **Request Body**:
  ```json
  {
    "username": "engineer",
    "password": "engineer123"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "engineer",
      "role": "ENGINEER"
    }
  }
  ```

### `GET /api/auth/me`
Returns current user profile and role privileges.
- **Headers**: `Authorization: Bearer <token>`

### `POST /api/auth/register`
Admin-only user provisioning endpoint.

### `GET /api/auth/audit`
Returns immutable audit log entries (actions, usernames, timestamps, client IP).

---

## 2. Ingestion & Preprocessing

### `POST /api/screening/upload` (Alias: `POST /api/upload`)
Ingests raw CSV/TSV flight screening telemetry.
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file`: CSV file (max 50MB)
  - `column_mapping` (optional): JSON string of manual column overrides.
- **Response** `200 OK`:
  ```json
  {
    "batch_id": 4,
    "rows": 18,
    "valid": 18,
    "missing": 0,
    "lots": 4,
    "has_ground_truth": false,
    "columns_detected": {
      "component_id": "component_id",
      "v0": "value_0h",
      "v24": "value_24h",
      "v96": "value_96h",
      "v168": "value_168h"
    },
    "validation_issues": []
  }
  ```

---

## 3. Screening & AI Intelligence

### `POST /api/screening/analyze/{batch_id}` (Alias: `POST /api/analyze/{batch_id}`)
Executes the end-to-end qualification pipeline across all batches.
- **Response** `200 OK`:
  ```json
  {
    "batch_id": 4,
    "safe": 14,
    "monitor": 2,
    "reject": 2,
    "risk_distribution": {"LOW": 14, "MEDIUM": 2, "HIGH": 1, "CRITICAL": 1},
    "mission_health": 88,
    "lot_summaries": [...],
    "evaluation_metrics": {...},
    "top_flagged": {...}
  }
  ```

### `GET /api/screening/results/{batch_id}`
Returns analyzed summary for an existing batch.

### `GET /api/screening/components/{batch_id}` (Alias: `GET /api/components`)
Lists components for a batch with optional filtering:
- Query parameters: `status`, `risk_level`, `lot_id`, `subsystem`, `search`, `limit`, `offset`.

### `GET /api/screening/components/{batch_id}/{component_id}` (Alias: `GET /api/components/{component_id}`)
Returns full physical telemetry, lot comparison, drift rates, risk breakdown, and XAI explanation points for a component.

### `GET /api/screening/lot/{lot_id}` (Alias: `GET /api/lots/{lot_id}`)
Returns cohort distribution statistics (mean, median, MAD, robust sigma, pass rates) for a specific wafer lot.

### `GET /api/screening/export/{batch_id}` (Alias: `GET /api/report/{batch_id}`)
Streams an engineering qualification CSV report.

### `GET /api/health`
System liveness check & version telemetry.
