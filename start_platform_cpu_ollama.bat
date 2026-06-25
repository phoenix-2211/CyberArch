@echo off
title CypherGuard SOC Platform (Vulkan GPU Acceleration)

echo =====================================================
echo  Starting CypherGuard in Vulkan GPU-Accelerated Mode
echo =====================================================

echo [1/3] Terminating any running Ollama processes...
taskkill /f /im "ollama app.exe" 2>nul
taskkill /f /im "ollama.exe" 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Starting Ollama in Vulkan GPU mode (bypassing CUDA)...
set CUDA_VISIBLE_DEVICES=-1
set OLLAMA_CUDA_BYPASS=1
start "" "C:\Users\ACER\AppData\Local\Programs\Ollama\ollama.exe" serve
timeout /t 3 /nobreak >nul

echo [3/3] Launching CypherGuard Control Panel...
python apps/control_panel_gui.py
