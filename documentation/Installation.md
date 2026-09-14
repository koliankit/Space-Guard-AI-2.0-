# ASTRA VIGIL — Local Installation & Setup Guide

---

## 1. Prerequisites
- **Python**: 3.10, 3.11, or 3.12 (standard virtual environment)
- **Node.js**: 18+ or 20+ with `npm`
- **Operating System**: Windows, Linux (Ubuntu/Debian/RHEL), or macOS

---

## 2. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Activate your virtual environment**:
   - On Windows (PowerShell):
     ```powershell
     ..\.venv\Scripts\Activate.ps1
     ```
   - On Linux / macOS:
     ```bash
     source ../.venv/bin/activate
     ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize Database & Start Backend Server**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   - API endpoints live at: `http://localhost:8000`
   - Interactive Swagger docs at: `http://localhost:8000/docs`

---

## 3. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   - Web application opens at: `http://localhost:5173`

4. **Build Production Distribution**:
   ```bash
   npm run build
   ```
