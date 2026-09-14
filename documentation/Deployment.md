# ASTRA VIGIL — Private / On-Premise Deployment Guide

**Target Environment**: Air-gapped / Isolated Organization Private Network  
**Container Engine**: Docker & Docker Compose

---

## 1. Production Architecture Overview
```
           +-------------------------------------------------------+
           |                Private Organization Network           |
           |                                                       |
           |   Browser Client ---> Port 80 (Nginx Container)       |
           |                               |                       |
           |                  +------------+------------+          |
           |                  |                         |          |
           |             Static SPA              /api/ proxy       |
           |          (HTML/JS/3D WebGL)                |          |
           |                                            v          |
           |                              FastAPI Backend Container|
           |                                  (AI Core Engine)     |
           |                                            |          |
           |                                            v          |
           |                              PostgreSQL DB Container  |
           |                                 (Internal Network)    |
           +-------------------------------------------------------+
```

---

## 2. One-Command Self-Hosted Deployment

1. **Clone or transfer repository to host server**:
   ```bash
   git clone https://github.com/koliankit/Space-Guard-AI-2.0-.git
   cd Space-Guard-AI-2.0-
   ```

2. **Configure Environment Secrets**:
   ```bash
   cp .env.example .env
   # Edit .env to set strong database passwords and cryptographic JWT keys:
   nano .env
   ```

3. **Launch Containerized Stack**:
   ```bash
   docker compose up -d --build
   ```

4. **Verify Container Health**:
   ```bash
   docker compose ps
   ```

---

## 3. Database Persistence & Backup Procedures

### A. Persistent Volume Locations
- Database records are stored in the Docker volume `postgres_data`.
- Uploaded batch artifacts and datasets are stored in `backend_data`.

### B. Creating an Automated Database Backup
```bash
docker exec -t astra_vigil_db pg_dump -U astra astra_vigil > astra_vigil_backup_$(date +%Y%m%d).sql
```

### C. Restoring from a Backup
```bash
cat astra_vigil_backup_20260915.sql | docker exec -i astra_vigil_db psql -U astra -d astra_vigil
```
