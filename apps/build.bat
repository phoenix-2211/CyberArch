@echo off
title CypherGuard — Build EXEs
color 0A

echo.
echo  ==========================================
echo   CypherGuard SOC Platform — EXE Builder
echo  ==========================================
echo.

:: Clean old builds
if exist build    rmdir /s /q build
if exist dist     rmdir /s /q dist
if exist *.spec   del /q *.spec

echo  [1/3] Installing / upgrading PyInstaller...
pip install --upgrade pyinstaller --quiet
if errorlevel 1 (
    echo  ERROR: pip failed. Make sure Python is on PATH.
    pause
    exit /b 1
)

echo  [2/3] Building CypherGuard-Setup.exe ...
pyinstaller ^
  --onefile ^
  --windowed ^
  --name "CypherGuard-Setup" ^
  --icon "icon.ico" ^
  --clean ^
  installer_gui.py

if errorlevel 1 (
    echo  ERROR: installer build failed.
    pause
    exit /b 1
)

echo  [3/3] Building CypherGuard-ControlPanel.exe ...
pyinstaller ^
  --onefile ^
  --windowed ^
  --name "CypherGuard-ControlPanel" ^
  --icon "icon.ico" ^
  --clean ^
  control_panel_gui.py

if errorlevel 1 (
    echo  ERROR: control panel build failed.
    pause
    exit /b 1
)

echo.
echo  ==========================================
echo   BUILD COMPLETE
echo  ==========================================
echo.
echo   dist\CypherGuard-Setup.exe        (share this on GitHub Releases)
echo   dist\CypherGuard-ControlPanel.exe (installer auto-copies this)
echo.
echo  Tip: Upload CypherGuard-Setup.exe to your GitHub Releases tab.
echo  Users just double-click it — no Python needed on their machine.
echo.
pause
