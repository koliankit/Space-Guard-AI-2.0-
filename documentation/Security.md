# ASTRA VIGIL — Security Architecture & Policy

---

## 1. Zero External Dependency & Sovereign AI
- **No External Cloud AI APIs**: ASTRA VIGIL does not transmit sensitive component telemetry, wafer lot identifiers, or parametric measurements to external third-party LLMs or cloud endpoints.
- **Air-Gapped Operation**: Core AI (MAD, robust z-scoring, polynomial drift projection, Pure-NumPy Isolation Forest, XGBoost) runs natively on internal CPU/server resources.

---

## 2. Role-Based Access Control (RBAC)
The system enforces strict permission boundaries across four operational tiers:

| Role | Upload Telemetry | Execute AI Screening | View Flight Dashboard | Export Reports | User Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ENGINEER** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **ANALYST** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **VIEWER** | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## 3. Cryptographic & Credential Protections
1. **Password Hashing**: Passwords are never stored in plaintext. They are salted with 16 cryptographically secure random bytes and hashed using `PBKDF2-HMAC-SHA256` with 100,000 iterations.
2. **Session Security**: Authenticated sessions utilize signed `HMAC-SHA256` JWT bearer tokens with configurable expiration.
3. **Database Injection Protection**: All database queries utilize SQLAlchemy parameterized object-relational mappings. Raw string concatenation in SQL queries is prohibited.
4. **File Ingestion Guards**:
   - Max file size ceiling of 50MB.
   - Rejection of non-CSV/TSV extensions.
   - Header inspection for binary or null-byte injections (`\x00`).
5. **Immutable Audit Logging**: Key operational lifecycle actions (`LOGIN`, `UPLOAD`, `ANALYZE`, `EXPORT`, `USER_CREATED`) are stored with user IDs, timestamps, and client IP addresses for regulatory compliance.
