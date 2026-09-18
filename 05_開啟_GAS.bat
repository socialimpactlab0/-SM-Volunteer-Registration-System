@echo off
setlocal
cd /d "%~dp0"
title Open GAS

if not exist ".clasp.json" (
  echo [ERROR] .clasp.json was not found.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\clasp.cmd" (
  echo [ERROR] CLASP is not installed.
  pause
  exit /b 1
)

call "node_modules\.bin\clasp.cmd" open-script
if errorlevel 1 (
  echo [ERROR] Could not open the GAS project.
  pause
  exit /b 1
)

pause
endlocal
