@echo off
setlocal
cd /d "%~dp0"
title Pull from GAS

echo ========================================
echo 06 - Pull latest source from GAS
echo ========================================
echo WARNING: local files under src may be updated.
echo.

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

call "node_modules\.bin\clasp.cmd" pull
if errorlevel 1 (
  echo.
  echo [ERROR] CLASP pull failed.
  pause
  exit /b 1
)

echo.
echo [OK] Pull completed.
pause
endlocal
