@echo off
setlocal
cd /d "%~dp0"
title Create GAS Project

echo ========================================
echo 03 - Create Google Sheet and GAS project
echo ========================================
echo.

if exist ".clasp.json" (
  echo [STOP] .clasp.json already exists.
  echo This folder is already linked to a GAS project.
  echo Run step 04 instead.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\clasp.cmd" (
  echo [ERROR] CLASP is not installed.
  echo Run step 01 first.
  pause
  exit /b 1
)

if not exist "src\appsscript.json" (
  echo [ERROR] src\appsscript.json was not found.
  pause
  exit /b 1
)

copy /Y "src\appsscript.json" "%TEMP%\sm_volunteer_appsscript.json" >nul

call "node_modules\.bin\clasp.cmd" create-script --type sheets --title "SM Volunteer Registration System 2027" --rootDir src
if errorlevel 1 (
  echo.
  echo [ERROR] GAS project creation failed.
  if exist "%TEMP%\sm_volunteer_appsscript.json" copy /Y "%TEMP%\sm_volunteer_appsscript.json" "src\appsscript.json" >nul
  pause
  exit /b 1
)

if exist "%TEMP%\sm_volunteer_appsscript.json" copy /Y "%TEMP%\sm_volunteer_appsscript.json" "src\appsscript.json" >nul

echo.
echo [OK] GAS project created and .clasp.json generated.
echo Next: run step 04.
pause
endlocal
