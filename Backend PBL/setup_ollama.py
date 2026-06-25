# ==========================================================
# setup_ollama.py
# CypherGuard — Ollama Auto-Setup Script for Windows
# ==========================================================
# Run this ONCE before starting your Flask server:
#
#     python setup_ollama.py
#
# It will:
#   1. Check if Ollama is installed
#   2. Check if the llama3 model is downloaded
#   3. Pull llama3 if missing
#   4. Test Ollama with a quick ping
#   5. Print a green OK or tell you exactly what to fix
# ==========================================================

import subprocess
import sys
import os
import time

MODEL_NAME = "llama3"

def green(t):  return f"\033[92m{t}\033[0m"
def red(t):    return f"\033[91m{t}\033[0m"
def yellow(t): return f"\033[93m{t}\033[0m"
def bold(t):   return f"\033[1m{t}\033[0m"

def banner():
    print()
    print(bold("=" * 58))
    print(bold("  CypherGuard - Ollama Setup Checker"))
    print(bold("=" * 58))
    print()

def check_installed():
    print("  [1/4] Checking Ollama installation ...", end=" ")
    try:
        result = subprocess.run(
            ["ollama", "--version"],
            capture_output=True, text=True,
            encoding="utf-8", errors="replace",
            check=True
        )
        version = result.stdout.strip() or result.stderr.strip()
        print(green(f"OK  ({version})"))
        return True
    except FileNotFoundError:
        print(red("NOT FOUND"))
        print()
        print(red("  Ollama is not installed or not in your PATH."))
        print("  Install it from:  https://ollama.com/download")
        print()
        return False
    except subprocess.CalledProcessError as e:
        print(red(f"ERROR: {e}"))
        return False

def check_service_running():
    print("  [2/4] Checking Ollama service ...", end=" ")
    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True, text=True,
            encoding="utf-8", errors="replace",
            timeout=10
        )
        if result.returncode == 0:
            print(green("RUNNING"))
            return True
        else:
            print(yellow("NOT RUNNING - starting ..."))
            _start_service()
            return True
    except subprocess.TimeoutExpired:
        print(yellow("TIMEOUT - trying to start service ..."))
        _start_service()
        return True

def _start_service():
    try:
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
        time.sleep(3)
        print(green("  Service started."))
    except Exception as e:
        print(red(f"  Could not start Ollama service: {e}"))
        print("  Start it manually:  ollama serve")

def check_model():
    print(f"  [3/4] Checking model '{MODEL_NAME}' ...", end=" ")
    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True, text=True,
            encoding="utf-8", errors="replace",
            check=True, timeout=15
        )
        if MODEL_NAME in result.stdout:
            print(green("AVAILABLE"))
            return True
        else:
            print(yellow(f"NOT FOUND - pulling {MODEL_NAME} (this may take several minutes) ..."))
            print()
            pull = subprocess.run(
                ["ollama", "pull", MODEL_NAME],
                timeout=600
            )
            if pull.returncode == 0:
                print()
                print(green("  llama3 downloaded successfully."))
                return True
            else:
                print(red("  Pull failed. Check your internet connection."))
                return False
    except subprocess.TimeoutExpired:
        print(red("TIMEOUT - Ollama is not responding. Is it running?"))
        return False

def smoke_test():
    print("  [4/4] Running quick smoke test ...", end=" ", flush=True)
    proc = None
    try:
        proc = subprocess.Popen(
            ["ollama", "run", MODEL_NAME],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            errors="replace"        # FIX: replaces undecodable bytes instead of crashing
        )
        out, err = proc.communicate("Reply with exactly the word: OK", timeout=90)
        if out.strip():
            print(green("PASSED"))
            return True
        else:
            print(yellow("EMPTY RESPONSE"))
            return False
    except subprocess.TimeoutExpired:
        if proc:
            proc.kill()
        print(red("TIMEOUT (90s) - model may still be loading, try again in 30s"))
        return False
    except Exception as e:
        print(red(f"ERROR: {e}"))
        return False

def check_prompts():
    print()
    print("  Checking /prompts/ folder ...", end=" ")
    required = [
        "prompt_full_soc.txt",
        "prompt_alert_analysis.txt",
        "prompt_risk_summary.txt"
    ]
    missing = [f for f in required if not os.path.exists(os.path.join("prompts", f))]
    if not missing:
        print(green("OK - all 3 prompt files found"))
    else:
        print(yellow(f"MISSING {len(missing)} file(s)"))
        for f in missing:
            print(f"    prompts/{f}")
        print()
        print("  Place the 3 prompt .txt files inside a /prompts/ folder")
        print("  in your Backend PBL project root.")

def main():
    os.system("")   # Enable ANSI colours on Windows 10+

    banner()

    ok = check_installed()
    if not ok:
        sys.exit(1)

    check_service_running()
    model_ok = check_model()
    if not model_ok:
        sys.exit(1)

    test_ok = smoke_test()
    check_prompts()

    print()
    print(bold("=" * 58))
    if test_ok:
        print(green(bold("  Ollama is ready. You can now run:  python app.py")))
    else:
        print(yellow(bold("  Ollama installed but smoke test uncertain.")))
        print(yellow("  Try running app.py - it may still work fine."))
    print(bold("=" * 58))
    print()

if __name__ == "__main__":
    main()