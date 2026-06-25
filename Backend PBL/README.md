# ⚔ CypherGuard — Secure IoT SOC Platform

> A professional, locally-hosted IoT Security Operations Centre with AI-powered analysis, SIEM, SOAR automation, and blockchain verification.

---

## Quick Start

### Option A — Run from source (recommended for development)

```bash
git clone https://github.com/yourname/CypherGuard
cd CypherGuard
python installer/installer_gui.py
```

### Option B — Download installer

Download `CypherGuard-Setup.exe` from [Releases](../../releases) and run it.

---

## What the Installer Does

| Step | Action |
|------|--------|
| 1 | Copies project files to chosen directory |
| 2 | Creates Python virtual environment |
| 3 | Installs all Python dependencies |
| 4 | Generates `.env` with secure random keys |
| 5 | Initializes SQLite database + blockchain genesis block |
| 6 | Downloads and installs Ollama + llama3 AI model |
| 7 | Creates desktop shortcut to Control Panel |

---

## Control Panel

Launch `CypherGuard Control Panel.bat` (or the `.exe` from Releases).

| Button | Action |
|--------|--------|
| ▶ START | Starts Flask backend + Vite frontend |
| ■ STOP | Stops all services cleanly |
| 🌐 Open Dashboard | Opens `http://localhost:8081` |
| 📂 Install Folder | Opens installation directory |

---

## Architecture

```
CypherGuard/
├── backend/
│   ├── app.py               # Flask entry point
│   ├── models.py            # SQLAlchemy models
│   ├── auth.py              # JWT auth + role system
│   ├── siem.py              # SIEM routes
│   ├── siem_engine.py       # Detection rules
│   ├── soar.py              # SOAR routes
│   ├── soar_engine.py       # Automated response
│   ├── ai_routes.py         # AI analysis endpoints
│   ├── ai_soc_engine.py     # Ollama/LLaMA3 engine
│   ├── blockchain_engine.py # Immutable audit log
│   └── device.py            # IoT device management
├── frontend/                # React + Vite dashboard
├── reports/                 # Generated AI reports
├── installer/
│   ├── installer_gui.py     # GUI installer (tkinter)
│   └── build.bat            # PyInstaller build script
├── control_panel_gui.py     # XAMPP-style control panel
├── requirements.txt
└── .env.template
```

---

## Requirements

- Windows 10/11
- Python 3.10+
- Node.js 18+ (for frontend)
- 8GB RAM recommended (for llama3 model)
- 10GB disk space

---

## Manual Ollama Setup

If the installer skipped Ollama:

```bash
# 1. Download from https://ollama.com/download
# 2. Install it
# 3. Pull the model:
ollama pull llama3
# 4. Start the service:
ollama serve
```

---

## Default Credentials

After installation, log in with:
- **Username:** `admin`
- **Password:** Set during first run

> The database is empty on first install. Register your admin account via the API or directly in the DB.

---

## License

MIT — Free for educational and personal use.