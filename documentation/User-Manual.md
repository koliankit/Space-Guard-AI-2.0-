# ASTRA VIGIL — Flight Qualification Engineer User Manual

---

## 1. Getting Started & Logging In
1. Open the ASTRA VIGIL portal in your web browser: `http://localhost:5173` (or port `80` in Docker).
2. Click **Sign In / Authenticate** in the mission header.
3. Enter your assigned spaceflight qualification credentials (default accounts: `engineer` / `engineer123` or `admin` / `admin123`).

---

## 2. Ingesting a Screening CSV
1. Click **Ingest Screening Data** on the top mission bar.
2. Drag and drop your `.csv` dataset or select **Upload Flight Dataset**.
3. The validation engine automatically verifies:
   - Mandatory columns (`component_id`, `lot_id`, `value_0h`, `value_24h`, `value_168h`)
   - Numeric validity and temperature limits
   - Unique component serial identifiers.
4. If non-standard column names are uploaded, the **Column Auto-Mapping Window** appears, allowing you to select which column corresponds to which burn-in parameter.

---

## 3. Running AI Screening & Anomaly Detection
1. Click **Initiate AI Screening Pipeline** (or press the primary activation trigger).
2. The system executes:
   - Module A: Dynamic Lot-Relative Peer Normalization
   - Module B: 0h $\rightarrow$ 24h $\rightarrow$ 96h $\rightarrow$ 168h Burn-In Drift Trajectory Analysis
   - Multi-factor Composite Risk Engine (0 - 100)
3. Summary counters instantly display:
   - **SAFE**: Fully qualified for spaceflight integration.
   - **MONITOR**: Elevated drift rate; secondary burn-in recommended.
   - **REJECT**: Breached datasheet limits, accelerated drift, or latent wafer outlier.

---

## 4. 3D Satellite Subsystem Localization & Inspection
1. Click on any component row in the matrix or flagged alerts list.
2. The **3D Satellite Bus** automatically highlights the physical equipment bay housing that component:
   - **Green Pin**: Nominal component.
   - **Amber Pin**: Monitored component.
   - **Red Pin**: High-risk / Critical defect.
3. The **Component Intelligence Panel** provides:
   - Real physical measurement curves (0h to 168h) with interactive crosshairs.
   - Lot comparison metrics (Median, Mean, Robust MAD, Z-score).
   - Natural language, physics-grounded explanation of why the component was flagged.

---

## 5. Exporting Official Mission Reports
1. Navigate to the **Mission Qualification Report** tab or click **Export CSV / PDF**.
2. Download official flight clearance documentation with full batch summary and quarantine lists.
