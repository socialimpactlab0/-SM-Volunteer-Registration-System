@echo off
setlocal
cd /d "%~dp0"
title Push to GAS

echo ========================================
echo 04 - Push local source to Google Apps Script
echo ========================================
echo.

if not exist ".clasp.json" (
  echo [ERROR] .clasp.json was not found.
  echo Run step 03 first, or create .clasp.json for an existing GAS project.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\clasp.cmd" (
  echo [ERROR] CLASP is not installed.
  echo Run step 01 first.
  pause
  exit /b 1
)

call "node_modules\.bin\clasp.cmd" push --force
if errorlevel 1 (
  echo.
  echo [ERROR] CLASP push failed.
  pause
  exit /b 1
)

echo.
echo [OK] Source code uploaded to GAS.
echo Next: run step 05.
pause
endlocal
