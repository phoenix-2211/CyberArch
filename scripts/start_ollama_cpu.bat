@echo off
echo Terminating running Ollama processes...
taskkill /f /im "ollama app.exe" 2>nul
taskkill /f /im "ollama.exe" 2>nul
timeout /t 2 /nobreak >nul

echo Starting Ollama in Vulkan GPU mode (bypassing CUDA)...
set CUDA_VISIBLE_DEVICES=-1
set OLLAMA_CUDA_BYPASS=1
start "" ollama serve
echo Ollama started in Vulkan GPU mode.
