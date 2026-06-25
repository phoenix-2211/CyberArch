# CypherGuard — Apps (Installer & Control Panel)

## Files

| File | Purpose |
|---|---|
| `installer_gui.py` | One-click setup wizard. Run this first on a fresh machine. |
| `control_panel_gui.py` | XAMPP-style control panel. Start/stop backend + frontend. |
| `build.bat` | Build standalone `.exe` files using PyInstaller (run on your dev machine). |

## Run from source (no .exe needed)

```bash
# Install (first time only)
python apps\installer_gui.py

# Every time after
python apps\control_panel_gui.py
```

## Build .exe files

```bash
cd apps
build.bat
# Output → apps\dist\CypherGuard-Setup.exe
#           apps\dist\CypherGuard-ControlPanel.exe
```

## How the installer works

1. Copies `backend/` and `frontend/` from repo root to chosen install directory
2. Creates `venv` inside backend and installs `requirements.txt`
3. Generates `.env` with secure random JWT key
4. Initialises SQLite database via Flask app context
5. Downloads Ollama from official site and installs silently
6. Pulls `llama3` model (~4 GB) to `<install_dir>\ollama_models\`
7. Saves `cypherguard.json` config so control panel knows paths

## How the control panel works

- Reads `cypherguard.json` (created by installer) for paths
- Starts Flask backend using `venv\Scripts\python.exe app.py`
- Starts Vite frontend using `npm run dev`
- Streams live logs from both processes into the log window
- Checks Ollama status via `ollama list`

## Requirements to BUILD the .exe

- Python 3.10+ on PATH
- Run `build.bat` once — it installs PyInstaller automatically
- Output EXE size: ~15–25 MB (Python bundled inside)

## Requirements to RUN the .exe (end users)

- Windows 10/11
- Internet connection (for Ollama download + model pull)
- Node.js 18+ (for frontend — not bundled in EXE)
