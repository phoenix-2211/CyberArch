"""
CypherGuard SOC Platform — Installer  v1.1
Tkinter-based installer. No extra dependencies needed.
Run: python installer_gui.py

FIXES vs v1.0:
  - Auto-detects backend/frontend folder names (handles "Backend PBL", etc.)
  - Default install dir = parent of apps/ (the CyberArch root, e.g. D:CyberArch)
  - Ollama: runs WITHOUT /S so UAC prompt appears and install actually works
  - DB init: writes a temp script inside backend dir so 'app' module import works
  - Steps reduced 6→5 (no separate extract step — files are already in place)
"""

# --- ADD THIS IMPORT (FIX 1) ---
import shutil
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import threading
import subprocess
import sys
import os
import json
import secrets
import urllib.request
import tempfile

APP_NAME     = "CypherGuard SOC Platform"
APP_VERSION  = "1.1.0"
CONFIG_FILE  = "cypherguard.json"
OLLAMA_URL   = "https://ollama.com/download/OllamaSetup.exe"
OLLAMA_MODEL = "gemma3:4b"

BG      = "#0d1117"
CARD    = "#161b22"
ACCENT  = "#00d4aa"
RED     = "#ff4c4c"
TEXT    = "#c9d1d9"
SUBTEXT = "#8b949e"


def find_folder(root: str, marker: str):
    """Search direct children of root for one containing `marker` file."""
    try:
        for name in os.listdir(root):
            path = os.path.join(root, name)
            if os.path.isdir(path) and os.path.exists(os.path.join(path, marker)):
                return path
    except Exception:
        pass
    return None


class InstallerApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(f"{APP_NAME} — Setup")
        self.geometry("760x600")
        self.resizable(False, False)
        self.configure(bg=BG)

        # Default = parent of apps/ folder or current folder depending on run location
        if getattr(sys, 'frozen', False):
            script_dir = os.path.dirname(os.path.abspath(sys.executable))
        else:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            
        if os.path.exists(os.path.join(script_dir, "Backend PBL")) or os.path.exists(os.path.join(script_dir, "app.py")):
            default = script_dir
        elif os.path.exists(os.path.join(os.path.dirname(script_dir), "Backend PBL")):
            default = os.path.dirname(script_dir)
        else:
            default = script_dir
            
        self._install_dir = tk.StringVar(value=default)
        self._build_ui()

    def _build_ui(self):
        # Header
        hdr = tk.Frame(self, bg=CARD, height=64)
        hdr.pack(fill="x")
        tk.Label(hdr, text="⚡ " + APP_NAME, font=("Segoe UI", 16, "bold"),
                 fg=ACCENT, bg=CARD).pack(side="left", padx=20, pady=16)
        tk.Label(hdr, text=f"v{APP_VERSION}", font=("Segoe UI", 10),
                 fg=SUBTEXT, bg=CARD).pack(side="right", padx=20)

        # Dir picker
        df = tk.Frame(self, bg=BG)
        df.pack(fill="x", padx=24, pady=(16, 4))
        tk.Label(df, text="CyberArch root folder (contains your backend & frontend folders):",
                 font=("Segoe UI", 10), fg=TEXT, bg=BG).pack(anchor="w")
        row = tk.Frame(df, bg=BG)
        row.pack(fill="x", pady=4)
        self._dir_entry = tk.Entry(row, textvariable=self._install_dir,
                                   font=("Consolas", 10), bg=CARD, fg=TEXT,
                                   insertbackground=TEXT, relief="flat", bd=4)
        self._dir_entry.pack(side="left", fill="x", expand=True)
        tk.Button(row, text="Browse…", command=self._browse,
                  bg=CARD, fg=ACCENT, relief="flat", padx=10,
                  font=("Segoe UI", 9)).pack(side="left", padx=(6, 0))
        self._detect_lbl = tk.Label(df, text="", font=("Consolas", 8),
                                    fg=SUBTEXT, bg=BG, anchor="w")
        self._detect_lbl.pack(anchor="w", pady=(2, 0))

        # Progress
        pf = tk.Frame(self, bg=BG)
        pf.pack(fill="x", padx=24, pady=(10, 0))
        self._prog_label = tk.Label(pf, text="Ready to install.",
                                    font=("Segoe UI", 9), fg=SUBTEXT, bg=BG)
        self._prog_label.pack(anchor="w")
        self._pbar = ttk.Progressbar(pf, length=700, mode="determinate", maximum=100)
        self._pbar.pack(fill="x", pady=(4, 0))

        # Log
        lf = tk.Frame(self, bg=BG)
        lf.pack(fill="both", expand=True, padx=24, pady=10)
        self._log = scrolledtext.ScrolledText(lf, font=("Consolas", 9), bg=CARD,
                                              fg=TEXT, relief="flat",
                                              state="disabled", height=16)
        self._log.pack(fill="both", expand=True)

        # Buttons
        bf = tk.Frame(self, bg=BG)
        bf.pack(fill="x", padx=24, pady=(0, 16))
        self._install_btn = tk.Button(bf, text="▶  INSTALL",
                                      command=self._start_install,
                                      bg=ACCENT, fg="#000",
                                      font=("Segoe UI", 11, "bold"),
                                      relief="flat", padx=24, pady=6)
        self._install_btn.pack(side="left")
        tk.Button(bf, text="Exit", command=self.destroy,
                  bg=CARD, fg=TEXT, font=("Segoe UI", 10),
                  relief="flat", padx=16, pady=6).pack(side="right")

        self._install_dir.trace_add("write", lambda *_: self._preview())
        self._preview()

    def _preview(self):
        d = self._install_dir.get().strip()
        b = find_folder(d, "app.py")
        f = find_folder(d, "package.json")
        bname = os.path.basename(b) if b else "❌ NOT FOUND"
        fname = os.path.basename(f) if f else "❌ NOT FOUND"
        self._detect_lbl.configure(
            text=f"  Backend folder: {bname}    |    Frontend folder: {fname}"
        )

    def _browse(self):
        d = filedialog.askdirectory(title="Select your CyberArch root folder")
        if d:
            self._install_dir.set(os.path.normpath(d))

    # ── log / status helpers ──────────────────────────────────────────────────
    def _log_write(self, msg):
        def _do():
            self._log.configure(state="normal")
            self._log.insert("end", msg + "\n")
            self._log.see("end")
            self._log.configure(state="disabled")
        self.after(0, _do)

    def _set_status(self, msg, pct=None):
        def _do():
            self._prog_label.configure(text=msg)
            if pct is not None:
                self._pbar["value"] = pct
        self.after(0, _do)

    def _set_phase(self, phase):
        def _do():
            if phase == "running":
                self._install_btn.configure(state="disabled", text="Installing…")
                self._dir_entry.configure(state="disabled")
            elif phase == "done":
                self._install_btn.configure(
                    state="normal", bg="#1f6f50",
                    text="✔  Done — Launch Control Panel",
                    command=self._launch_cp)
            elif phase == "error":
                self._install_btn.configure(
                    state="normal", bg=RED,
                    text="⚠  Retry", command=self._start_install)
                self._dir_entry.configure(state="normal")
        self.after(0, _do)

    # ── Install ───────────────────────────────────────────────────────────────
    def _start_install(self):
        root = self._install_dir.get().strip()
        if not root:
            messagebox.showerror("Error", "Please select a folder."); return

        backend_src  = find_folder(root, "app.py")
        frontend_src = find_folder(root, "package.json")

        if not backend_src:
            messagebox.showerror(
                "Backend not found",
                f"No folder with app.py found inside:\n{root}\n\n"
                "Select the CyberArch folder that contains your backend folder."
            )
            return

        self._set_phase("running")
        self._log.configure(state="normal"); self._log.delete("1.0","end")
        self._log.configure(state="disabled")
        threading.Thread(
            target=self._run,
            args=(root, backend_src, frontend_src),
            daemon=True
        ).start()

    def _run(self, root, backend_src, frontend_src):
        try:
            self._step1_venv(backend_src)
            self._step2_deps(backend_src)
            self._step3_env(backend_src)
            self._step4_db(backend_src)
            self._step5_ollama(root)
            self._save_config(root, backend_src, frontend_src)
            self._set_status("Installation complete! ✔", 100)
            self._log_write("\n✔ CypherGuard installed successfully!")
            self._set_phase("done")
        except Exception as e:
            self._log_write(f"\n✘ Error: {e}")
            self._set_status("Installation failed.", 0)
            self._set_phase("error")

    # Step 1 — venv (always recreate if Python version doesn't match)
    def _step1_venv(self, backend_src):
        self._set_status("Step 1/5 — Creating virtual environment…", 5)
        self._log_write(f"[1/5] Creating venv inside:\n      {backend_src}")
        venv_dir    = os.path.join(backend_src, "venv")
        venv_python = os.path.join(venv_dir, "Scripts", "python.exe")

        # Check if existing venv matches current Python version
        if os.path.exists(venv_python):
            r = subprocess.run([venv_python, "--version"],
                               capture_output=True, text=True)
            venv_ver   = r.stdout.strip() + r.stderr.strip()   # e.g. "Python 3.11.x"
            system_ver = f"Python {sys.version_info.major}.{sys.version_info.minor}"
            if system_ver in venv_ver:
                self._log_write(f"  ✔ venv exists and matches {system_ver} — skipping.")
                return
            else:
                self._log_write(
                    f"  ⚠ venv version mismatch!\n"
                    f"    venv:   {venv_ver}\n"
                    f"    system: {system_ver}\n"
                    f"  Deleting old venv and recreating with {system_ver}…"
                )
                shutil.rmtree(venv_dir, ignore_errors=True)

        r = subprocess.run(
            [sys.executable, "-m", "venv", venv_dir],
            capture_output=True, text=True
        )
        if r.returncode != 0:
            raise RuntimeError(f"venv creation failed:\n{r.stderr}")
        self._log_write(f"  ✔ Virtual environment created (Python {sys.version_info.major}.{sys.version_info.minor}).")

    # Step 2 — pip install (show full error on failure)
    def _step2_deps(self, backend_src):
        self._set_status("Step 2/5 — Installing Python packages…", 20)
        self._log_write("[2/5] Running pip install (may take 1–2 min)…")

        python = os.path.join(backend_src, "venv", "Scripts", "python.exe")
        req = os.path.join(backend_src, "requirements.txt")

        if not os.path.exists(req):
            self._log_write("  ⚠ requirements.txt not found — skipping.")
            return

        if not os.path.exists(python):
            raise RuntimeError(f"python.exe not found at:\n{python}")

        # Upgrade pip
        self._log_write("  → Upgrading pip...")
        subprocess.run(
            [python, "-m", "pip", "install", "--upgrade", "pip"],
            cwd=backend_src
        )

        self._log_write("  → Installing dependencies...\n")

        # 🔥 KEY: use python -u -m pip (unbuffered output)
        process = subprocess.Popen(
            [python, "-u", "-m", "pip", "install", "-r", req],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=backend_src
        )

        stdout = process.stdout
        if stdout is None:
            raise RuntimeError("Failed to capture pip output.")

        error_lines = []

        for line in stdout:
            clean = line.strip()
            self._log_write("  " + clean)

            # Capture error hints
            if "ERROR" in clean or "Failed" in clean:
                error_lines.append(clean)

        process.wait()

        if process.returncode != 0:
            raise RuntimeError(
                "pip install failed.\n\n"
                + ("\n".join(error_lines[:10]) if error_lines else "Check logs above 👆")
            )

        self._log_write("  ✔ All packages installed.")
    # Step 3 — .env
    def _step3_env(self, backend_src):
        self._set_status("Step 3/5 — Writing .env file…", 50)
        self._log_write("[3/5] Writing .env…")
        env_path = os.path.join(backend_src, ".env")
        if os.path.exists(env_path):
            self._log_write("  ✔ .env already exists — keeping existing keys."); return
        key = secrets.token_hex(32)
        with open(env_path, "w") as f:
            f.write(
                f"JWT_SECRET_KEY={key}\n"
                "CORS_ORIGINS=http://localhost:8088,http://127.0.0.1:8088,"
                "http://localhost:8080,http://127.0.0.1:8080\n"
                "FLASK_DEBUG=false\n"
                "JWT_EXPIRES_MINUTES=60\n"
            )
        self._log_write("  ✔ .env written with fresh JWT secret.")

    # Step 4 — init DB (write temp script inside backend dir so imports resolve)
    def _step4_db(self, backend_src):
        self._set_status("Step 4/5 — Initialising database…", 65)
        self._log_write("[4/5] Initialising SQLite database…")
        python = os.path.join(backend_src, "venv", "Scripts", "python.exe")
        script = os.path.join(backend_src, "_init_db_temp.py")
        code = (
            "import sys, os\n"
            "sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n"
            "from app import create_app\n"
            "from models import db\n"
            "app = create_app()\n"
            "with app.app_context():\n"
            "    db.create_all()\n"
            "print('DB_OK')\n"
        )
        with open(script, "w") as f:
            f.write(code)
        try:
            r = subprocess.run([python, script],
                               capture_output=True, text=True,
                               cwd=backend_src, timeout=60)
            if "DB_OK" in r.stdout:
                self._log_write("  ✔ Database tables created.")
            else:
                self._log_write(f"  ⚠ DB warning (non-fatal): {r.stderr[:300]}")
        finally:
            try:
                os.remove(script)
            except Exception:
                pass

    # Step 5 — Ollama (NO /S flag — allows UAC to work)
    def _step5_ollama(self, root):
        self._set_status("Step 5/5 — Installing Ollama…", 75)
        self._log_write("[5/5] Downloading Ollama (~120 MB)…")
        self._log_write("      A Windows UAC prompt will appear — click YES to install.")

        tmp = tempfile.mktemp(suffix=".exe", prefix="OllamaSetup_")
        installed = False
        try:
            def hook(count, block, total):
                if total > 0:
                    pct = min(int(count * block * 25 / total), 25)
                    self.after(0, lambda p=pct: self._pbar.configure(value=75 + p))

            urllib.request.urlretrieve(OLLAMA_URL, tmp, hook)
            self._log_write("  ✔ Download complete. Launching installer…")
            # Run normally (no /S) so Windows UAC can elevate it
            r = subprocess.run([tmp], timeout=300)
            if r.returncode in (0, 1):       # 1 = already installed
                self._log_write("  ✔ Ollama installed.")
                installed = True
            else:
                self._log_write(
                    f"  ⚠ Ollama installer exited with code {r.returncode}.\n"
                    "    If it's already installed, that's fine."
                )
                installed = True
        except subprocess.TimeoutExpired:
            self._log_write("  ⚠ Installer timed out. Install Ollama manually.")
        except Exception as e:
            self._log_write(f"  ⚠ Ollama install error: {e}")
        finally:
            try:
                os.remove(tmp)
            except Exception:
                pass

        # Create model directory for portable setup
        model_dir = os.path.join(root, "ollama_models")
        os.makedirs(model_dir, exist_ok=True)

    def _save_config(self, root, backend_src, frontend_src):
        if getattr(sys, 'frozen', False):
            script_dir = os.path.dirname(os.path.abspath(sys.executable))
        else:
            script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Save to apps/cypherguard.json (relative to script_dir)
        config_apps = {
            "install_dir":   os.path.relpath(root, script_dir),
            "backend_dir":   os.path.relpath(backend_src, script_dir),
            "frontend_dir":  os.path.relpath(frontend_src, script_dir) if frontend_src else "",
            "ollama_models": os.path.relpath(os.path.join(root, "ollama_models"), script_dir),
            "version":       APP_VERSION
        }
        with open(os.path.join(script_dir, CONFIG_FILE), "w") as f:
            json.dump(config_apps, f, indent=2)

        # Save to root/cypherguard.json (relative to root)
        config_root = {
            "install_dir":   ".",
            "backend_dir":   os.path.relpath(backend_src, root),
            "frontend_dir":  os.path.relpath(frontend_src, root) if frontend_src else "",
            "ollama_models": "ollama_models",
            "version":       APP_VERSION
        }
        with open(os.path.join(root, CONFIG_FILE), "w") as f:
            json.dump(config_root, f, indent=2)

        self._log_write(f"  ✔ Config saved with relative paths.")

    def _launch_cp(self):
        if getattr(sys, 'frozen', False):
            script_dir = os.path.dirname(os.path.abspath(sys.executable))
        else:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            
        cp_exe = os.path.join(script_dir, "CypherGuard-ControlPanel.exe")
        if not os.path.exists(cp_exe):
            cp_exe = os.path.join(os.path.dirname(script_dir), "CypherGuard-ControlPanel.exe")
        if not os.path.exists(cp_exe):
            cp_exe = os.path.join(script_dir, "dist", "CypherGuard-ControlPanel.exe")

        if os.path.exists(cp_exe):
            subprocess.Popen([cp_exe], cwd=os.path.dirname(cp_exe))
        else:
            cp_py = os.path.join(script_dir, "control_panel_gui.py")
            if os.path.exists(cp_py):
                subprocess.Popen([sys.executable, cp_py], cwd=script_dir)
            else:
                messagebox.showinfo("Done", "Install complete!\nRun CypherGuard-ControlPanel.exe to start.")
        self.destroy()


if __name__ == "__main__":
    InstallerApp().mainloop()