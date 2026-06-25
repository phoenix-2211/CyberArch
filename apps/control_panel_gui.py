"""
CypherGuard SOC Platform — Control Panel  v1.2
- Checks if ports are already occupied before starting
- Shows which process is blocking a port (e.g. Jenkins on 8080)
- Auto-finds next free port for Vite if 8080 is taken
- Reads actual Vite port from vite.config.ts
- Updates vite.config.ts with the chosen free port
Run: python control_panel_gui.py
"""

import tkinter as tk
from tkinter import scrolledtext, messagebox
import subprocess
import threading
import sys
import os
import json
import re
import time
import socket
import webbrowser
import queue

if getattr(sys, 'frozen', False):
    _HERE = os.path.dirname(os.path.abspath(sys.executable))
else:
    _HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(_HERE, "cypherguard.json")

# Default ports — may change if occupied
DEFAULT_BACKEND_PORT  = 5000
DEFAULT_FRONTEND_PORT = 8088

BG      = "#0d1117"
CARD    = "#161b22"
ACCENT  = "#00d4aa"
RED     = "#ff4c4c"
ORANGE  = "#f0883e"
YELLOW  = "#e3b341"
GREEN   = "#3fb950"
TEXT    = "#c9d1d9"
SUBTEXT = "#8b949e"


# ── Port utilities ─────────────────────────────────────────────────────────────

def is_port_free(port: int) -> bool:
    """Return True if nothing is listening on localhost:port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) != 0


def find_free_port(start: int, avoid: list[int] = []) -> int:
    """Find the next free port starting from `start`, skipping `avoid`."""
    port = start
    while True:
        if port not in avoid and is_port_free(port):
            return port
        port += 1
        if port > 65535:
            raise RuntimeError("No free ports available above " + str(start))


def get_port_owner(port: int) -> str:
    """
    Try to find what process is using the port.
    Uses netstat on Windows, lsof on Linux/Mac.
    Returns a human-readable string like 'java.exe (PID 1234)' or 'unknown'.
    """
    try:
        if sys.platform == "win32":
            r = subprocess.run(
                ["netstat", "-ano", "-p", "TCP"],
                capture_output=True, text=True, timeout=5
            )
            for line in r.stdout.splitlines():
                if f":{port} " in line and "LISTENING" in line:
                    pid = line.strip().split()[-1]
                    # Get process name from PID
                    r2 = subprocess.run(
                        ["tasklist", "/FI", f"PID eq {pid}", "/NH", "/FO", "CSV"],
                        capture_output=True, text=True, timeout=5
                    )
                    for l in r2.stdout.splitlines():
                        if pid in l:
                            name = l.split(",")[0].strip('"')
                            return f"{name} (PID {pid})"
        else:
            r = subprocess.run(
                ["lsof", "-i", f":{port}", "-sTCP:LISTEN", "-n", "-P"],
                capture_output=True, text=True, timeout=5
            )
            lines = r.stdout.strip().splitlines()
            if len(lines) > 1:
                parts = lines[1].split()
                return f"{parts[0]} (PID {parts[1]})"
    except Exception:
        pass
    return "unknown process"


def read_vite_port(frontend_dir: str) -> int:
    """Parse port from vite.config.ts. Returns DEFAULT_FRONTEND_PORT if not found."""
    cfg = os.path.join(frontend_dir, "vite.config.ts")
    if not os.path.exists(cfg):
        return DEFAULT_FRONTEND_PORT
    try:
        with open(cfg, encoding="utf-8") as f:
            content = f.read()
        m = re.search(r"port\s*:\s*(\d+)", content)
        if m:
            return int(m.group(1))
    except Exception:
        pass
    return DEFAULT_FRONTEND_PORT


def update_vite_port(frontend_dir: str, new_port: int):
    """Update the port value in vite.config.ts."""
    cfg = os.path.join(frontend_dir, "vite.config.ts")
    if not os.path.exists(cfg):
        return
    with open(cfg, encoding="utf-8") as f:
        content = f.read()
    new_content = re.sub(r"(port\s*:\s*)\d+", rf"\g<1>{new_port}", content)
    with open(cfg, "w", encoding="utf-8") as f:
        f.write(new_content)


def _find_folder(root: str, marker: str):
    try:
        for name in os.listdir(root):
            path = os.path.join(root, name)
            if os.path.isdir(path) and os.path.exists(os.path.join(path, marker)):
                return path
    except Exception:
        pass
    return None


# ═══════════════════════════════════════════════════════════════════════════════
class ControlPanel(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("CypherGuard SOC Platform — Control Panel")
        self.geometry("860x680")
        self.resizable(False, False)
        self.configure(bg=BG)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

        self._config        = self._load_config()
        self._backend_proc  = None
        self._frontend_proc = None
        self._log_queue     = queue.Queue()
        self._running       = False

        # Ports (may be adjusted at runtime)
        self._backend_port  = DEFAULT_BACKEND_PORT
        self._frontend_port = DEFAULT_FRONTEND_PORT

        self._build_ui()
        self._check_ports_on_startup()
        self._poll_logs()

    # ── Config ────────────────────────────────────────────────────────────────
    def _load_config(self):
        cfg_dir = os.path.dirname(os.path.abspath(CONFIG_FILE))
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE) as f:
                    cfg = json.load(f)
                
                # Resolve relative paths to absolute relative to CONFIG_FILE's directory
                for key in ["install_dir", "backend_dir", "frontend_dir", "ollama_models"]:
                    val = cfg.get(key)
                    if val and not os.path.isabs(val):
                        cfg[key] = os.path.abspath(os.path.join(cfg_dir, val))
                        
                if not cfg.get("backend_dir") or \
                   not os.path.exists(cfg.get("backend_dir", "")):
                    root = cfg.get("install_dir", os.path.dirname(_HERE))
                    cfg["backend_dir"]  = _find_folder(root, "app.py")      or ""
                    cfg["frontend_dir"] = _find_folder(root, "package.json") or ""
                return cfg
            except Exception:
                pass
        root = os.path.dirname(_HERE)
        return {
            "install_dir":   root,
            "backend_dir":   _find_folder(root, "app.py")      or "",
            "frontend_dir":  _find_folder(root, "package.json") or "",
            "ollama_models": os.path.join(root, "ollama_models"),
        }

    # ── Port check on startup ─────────────────────────────────────────────────
    def _check_ports_on_startup(self):
        """Run port check after UI is ready, so labels are all built."""
        self.after(300, self._do_port_check)

    def _do_port_check(self):
        if self._running:
            return
        frontend_dir = self._config.get("frontend_dir", "")

        # Read the port Vite is configured to use
        if frontend_dir:
            self._frontend_port = read_vite_port(frontend_dir)

        issues = []

        # Check backend port
        if not is_port_free(self._backend_port):
            owner = get_port_owner(self._backend_port)
            issues.append(
                f"Port {self._backend_port} (Flask Backend) is already in use by {owner}."
            )
            self._backend_dot.configure(fg=ORANGE)

        # Check frontend port
        if not is_port_free(self._frontend_port):
            owner = get_port_owner(self._frontend_port)
            # Find a free alternative
            alt = find_free_port(self._frontend_port + 1,
                                 avoid=[self._backend_port])
            issues.append(
                f"Port {self._frontend_port} (Vite Frontend) is in use by {owner}.\n"
                f"  → Will automatically use port {alt} instead."
            )
            self._frontend_dot.configure(fg=ORANGE)
            self._frontend_port = alt
            # Update vite.config.ts so Vite actually starts on the new port
            if frontend_dir:
                update_vite_port(frontend_dir, alt)

        # Update footer with actual ports
        self._footer_lbl.configure(
            text=f"Backend: http://localhost:{self._backend_port}   "
                 f"Dashboard: http://localhost:{self._frontend_port}"
        )
        # Update service row detail text
        self._backend_port_lbl.configure(text=f"Port {self._backend_port}")
        self._frontend_port_lbl.configure(text=f"Port {self._frontend_port}")

        # Show warning if any conflicts
        if issues:
            msg = "⚠  PORT CONFLICTS DETECTED\n\n" + "\n\n".join(issues)
            self._log_write(msg)
            self._port_warn_lbl.configure(
                text="⚠ Port conflict detected — see logs",
                fg=ORANGE
            )

    # ── UI ────────────────────────────────────────────────────────────────────
    def _build_ui(self):
        # Header
        hdr = tk.Frame(self, bg=CARD, height=64)
        hdr.pack(fill="x")
        tk.Label(hdr, text="⚡ CypherGuard SOC Platform",
                 font=("Segoe UI", 15, "bold"), fg=ACCENT, bg=CARD).pack(
                 side="left", padx=20, pady=16)
        tk.Label(hdr, text="Control Panel v1.2",
                 font=("Segoe UI", 10), fg=SUBTEXT, bg=CARD).pack(
                 side="right", padx=20)

        # Path + port warning row
        info = tk.Frame(self, bg=CARD)
        info.pack(fill="x", padx=16, pady=(6, 0))
        b = self._config.get("backend_dir", "")
        f = self._config.get("frontend_dir", "")
        bname = os.path.basename(b) if b else "NOT FOUND"
        fname = os.path.basename(f) if f else "NOT FOUND"
        tk.Label(info,
                 text=f"  Backend: {bname}    |    Frontend: {fname}",
                 font=("Consolas", 8), fg=SUBTEXT, bg=CARD).pack(
                 anchor="w", padx=8, pady=(4, 0))
        self._port_warn_lbl = tk.Label(info, text="  Checking ports…",
                                       font=("Segoe UI", 8), fg=SUBTEXT, bg=CARD)
        self._port_warn_lbl.pack(anchor="w", padx=8, pady=(0, 4))

        # Service status rows
        svc = tk.Frame(self, bg=CARD, pady=8)
        svc.pack(fill="x", padx=16, pady=(4, 0))
        self._backend_dot,  self._backend_port_lbl  = self._svc_row(
            svc, "Flask Backend",  f"Port {DEFAULT_BACKEND_PORT}")
        self._frontend_dot, self._frontend_port_lbl = self._svc_row(
            svc, "Vite Frontend",  f"Port {DEFAULT_FRONTEND_PORT}")
        self._ollama_dot,   _                       = self._svc_row(
            svc, "Ollama AI",       "Background service")

        # Port check button row
        pf = tk.Frame(self, bg=BG)
        pf.pack(fill="x", padx=16, pady=(6, 0))
        tk.Button(pf, text="🔍  Re-check Ports", command=self._do_port_check,
                  bg=CARD, fg=TEXT, font=("Segoe UI", 9),
                  relief="flat", padx=10, pady=4).pack(side="left")
        tk.Label(pf, text="  Checks which ports are free before starting",
                 font=("Segoe UI", 8), fg=SUBTEXT, bg=BG).pack(side="left", padx=8)

        # Main buttons
        bf = tk.Frame(self, bg=BG)
        bf.pack(fill="x", padx=16, pady=10)
        self._start_btn = self._btn(bf, "▶  START PLATFORM", self._start, ACCENT, "#000")
        self._start_btn.pack(side="left", padx=(0, 8))
        self._stop_btn  = self._btn(bf, "■  STOP PLATFORM",  self._stop,  RED, "#fff")
        self._stop_btn.configure(state="disabled")
        self._stop_btn.pack(side="left", padx=(0, 8))
        self._btn(bf, "🌐  Open Dashboard",
                  self._open_dash, CARD, ACCENT).pack(side="left", padx=(0, 8))
        self._btn(bf, "🔄  Restart",
                  self._restart,   CARD, YELLOW).pack(side="left")

        # Log viewer
        lf = tk.Frame(self, bg=BG)
        lf.pack(fill="both", expand=True, padx=16, pady=(0, 6))
        tk.Label(lf, text="Live Logs", font=("Segoe UI", 9, "bold"),
                 fg=SUBTEXT, bg=BG).pack(anchor="w")
        self._log = scrolledtext.ScrolledText(
            lf, font=("Consolas", 8), bg=CARD, fg=TEXT,
            relief="flat", state="disabled", height=20)
        self._log.pack(fill="both", expand=True)

        # Footer
        foot = tk.Frame(self, bg=CARD, height=28)
        foot.pack(fill="x", side="bottom")
        self._status_lbl = tk.Label(foot, text="● Stopped", fg=RED,
                                    font=("Segoe UI", 9), bg=CARD)
        self._status_lbl.pack(side="left", padx=12, pady=4)
        self._footer_lbl = tk.Label(
            foot,
            text=f"Backend: http://localhost:{DEFAULT_BACKEND_PORT}   "
                 f"Dashboard: http://localhost:{DEFAULT_FRONTEND_PORT}",
            font=("Segoe UI", 8), fg=SUBTEXT, bg=CARD)
        self._footer_lbl.pack(side="right", padx=12)

    def _svc_row(self, parent, name, detail):
        row = tk.Frame(parent, bg=CARD)
        row.pack(fill="x", padx=16, pady=2)
        dot = tk.Label(row, text="●", fg=RED, bg=CARD, font=("Segoe UI", 12))
        dot.pack(side="left")
        tk.Label(row, text=f"  {name}", font=("Segoe UI", 10, "bold"),
                 fg=TEXT, bg=CARD, width=20, anchor="w").pack(side="left")
        lbl = tk.Label(row, text=detail, font=("Segoe UI", 9),
                       fg=SUBTEXT, bg=CARD)
        lbl.pack(side="left")
        return dot, lbl

    def _btn(self, parent, text, cmd, bg, fg):
        return tk.Button(parent, text=text, command=cmd, bg=bg, fg=fg,
                         font=("Segoe UI", 10, "bold"), relief="flat",
                         padx=14, pady=6)

    # ── Start / Stop ──────────────────────────────────────────────────────────
    def _start(self):
        if self._running:
            return

        # Final port check right before launch
        blocked = []
        if not is_port_free(self._backend_port):
            owner = get_port_owner(self._backend_port)
            blocked.append(
                f"Port {self._backend_port} (Flask) is still in use by {owner}.\n"
                "Stop that process first, then try again."
            )
        # Frontend port was already auto-adjusted, so it should be free

        if blocked:
            messagebox.showerror("Port Conflict", "\n\n".join(blocked))
            return

        self._running = True
        self._start_btn.configure(state="disabled")
        self._stop_btn.configure(state="normal")
        self._log_write("═" * 60)
        self._log_write("Starting CypherGuard SOC Platform…")
        self._log_write(
            f"  Backend  → http://localhost:{self._backend_port}\n"
            f"  Frontend → http://localhost:{self._frontend_port}"
        )
        threading.Thread(target=self._launch, daemon=True).start()

    def _launch(self):
        backend_dir  = self._config.get("backend_dir",  "")
        frontend_dir = self._config.get("frontend_dir", "")

        if not backend_dir or not os.path.exists(backend_dir):
            self._log_write(
                f"[ERROR] Backend folder not found: {backend_dir}\n"
                "        Run the installer first."
            )
            self._running = False
            self.after(0, lambda: self._start_btn.configure(state="normal"))
            self.after(0, lambda: self._stop_btn.configure(state="disabled"))
            return

        # ✅ ALWAYS USE VENV PYTHON
        python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        if not os.path.exists(python):
            python = sys.executable
            self._log_write("[Backend] ⚠ venv not found — using system Python.")

        # ── Flask backend ──────────────────────────────────────────────────────
        env = os.environ.copy()
        models = self._config.get("ollama_models", "")
        if models:
            env["OLLAMA_MODELS"] = models

        # ✅ FORCE PORT FROM CONTROL PANEL (important fix)
        env["FLASK_RUN_PORT"] = str(self._backend_port)

        self._backend_proc = subprocess.Popen(
            [python, "app.py"],   # ✔ same logic, no change
            cwd=backend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )

        self.after(0, lambda: self._backend_dot.configure(fg=GREEN))
        self.after(0, lambda: self._status_lbl.configure(
            text="● Backend Running", fg=GREEN))

        self._log_write(
            f"[Backend] Flask started — PID {self._backend_proc.pid}\n"
            f"[Backend] → http://localhost:{self._backend_port}"
        )

        threading.Thread(
            target=self._stream,
            args=(self._backend_proc, "[Backend]"),
            daemon=True
        ).start()

        # ── Vite frontend (UNCHANGED) ───────────────────────────────────────────
        npm = "npm.cmd" if sys.platform == "win32" else "npm"
        if frontend_dir and os.path.exists(os.path.join(frontend_dir, "package.json")):
            nm = os.path.join(frontend_dir, "node_modules")
            if not os.path.exists(nm):
                self._log_write("[Frontend] node_modules missing — running npm install…")
                subprocess.run([npm, "install"], cwd=frontend_dir, capture_output=True)

            self._frontend_proc = subprocess.Popen(
                [npm, "run", "dev"],
                cwd=frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )

            self.after(0, lambda: self._frontend_dot.configure(fg=GREEN))
            self._log_write(
                f"[Frontend] Vite started — PID {self._frontend_proc.pid}\n"
                f"[Frontend] → http://localhost:{self._frontend_port}"
            )

            threading.Thread(
                target=self._stream,
                args=(self._frontend_proc, "[Frontend]"),
                daemon=True
            ).start()
        else:
            self._log_write(
                f"[Frontend] ⚠ package.json not found in: {frontend_dir}"
            )

        # ── Ollama ──────────────────────────────────────────────────────────────
        self._log_write("[Ollama] Applying CUDA bypass environment variables...")
        subprocess.run(["taskkill", "/f", "/im", "ollama app.exe"], capture_output=True)
        subprocess.run(["taskkill", "/f", "/im", "ollama.exe"], capture_output=True)
        time.sleep(1.0)

        ollama_env = os.environ.copy()
        ollama_env["CUDA_VISIBLE_DEVICES"] = "-1"
        ollama_env["OLLAMA_CUDA_BYPASS"] = "1"
        models_dir = self._config.get("ollama_models", "")
        if models_dir:
            ollama_env["OLLAMA_MODELS"] = models_dir

        ollama_path = os.path.expandvars(r"%USERPROFILE%\AppData\Local\Programs\Ollama\ollama.exe")
        if not os.path.exists(ollama_path):
            ollama_path = "ollama"  # fall back to PATH

        try:
            self._ollama_proc = subprocess.Popen(
                [ollama_path, "serve"],
                env=ollama_env,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )
            self._log_write(f"[Ollama] Started in Vulkan GPU mode (Bypassing CUDA) — PID {self._ollama_proc.pid}")
            time.sleep(4)
            
            # Check if running
            r = subprocess.run(["ollama", "list"], capture_output=True, text=True, timeout=10, env=ollama_env)
            if r.returncode == 0:
                self.after(0, lambda: self._ollama_dot.configure(fg=GREEN))
                self._log_write("[Ollama] ✔ Running & Ready.")
            else:
                self._log_write("[Ollama] ⚠ Server started but not responding yet.")
        except Exception as e:
            self._log_write(f"[Ollama] ⚠ Failed to start: {str(e)}")

    def _stream(self, proc, prefix):
        for line in proc.stdout:
            line = line.rstrip()
            if line:
                self._log_queue.put(f"{prefix} {line}")

    def _stop(self):
        self._log_write("Stopping services…")
        for proc in (self._backend_proc, self._frontend_proc, getattr(self, "_ollama_proc", None)):
            if proc and proc.poll() is None:
                if sys.platform == "win32":
                    try:
                        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True, timeout=5)
                    except Exception as e:
                        self._log_write(f"[Stop] taskkill failed for PID {proc.pid}: {e}")
                else:
                    proc.terminate()
                    try:
                        proc.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        proc.kill()

        # Force terminate any other processes on our backend and frontend ports to be absolutely sure
        if sys.platform == "win32":
            for port in (self._backend_port, self._frontend_port):
                try:
                    r = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, timeout=3)
                    for line in r.stdout.splitlines():
                        if f":{port} " in line and "LISTENING" in line:
                            pid = line.strip().split()[-1]
                            subprocess.run(["taskkill", "/F", "/T", "/PID", pid], capture_output=True, timeout=3)
                            self._log_write(f"[Stop] Terminated lingering process on port {port} (PID {pid})")
                except Exception:
                    pass

        self._backend_proc = None
        self._frontend_proc = None
        self._ollama_proc = None
        self._running = False
        self._start_btn.configure(state="normal")
        self._stop_btn.configure(state="disabled")
        for dot in (self._backend_dot, self._frontend_dot, self._ollama_dot):
            dot.configure(fg=RED)
        self._status_lbl.configure(text="● Stopped", fg=RED)
        self._log_write("All services stopped.")

    def _restart(self):
        self._stop()
        self.after(1500, self._start)

    def _open_dash(self):
        webbrowser.open(f"http://localhost:{self._frontend_port}")

    # ── Log polling ───────────────────────────────────────────────────────────
    def _poll_logs(self):
        try:
            while True:
                self._log_write(self._log_queue.get_nowait())
        except Exception:
            pass
        self.after(200, self._poll_logs)

    def _log_write(self, msg):
        def _do():
            self._log.configure(state="normal")
            self._log.insert("end", msg + "\n")
            self._log.see("end")
            self._log.configure(state="disabled")
        self.after(0, _do)

    def _on_close(self):
        if self._running:
            if messagebox.askyesno("Exit", "Services are running. Stop them and exit?"):
                self._stop()
                self.after(1000, self.destroy)
        else:
            self.destroy()


if __name__ == "__main__":
    ControlPanel().mainloop()