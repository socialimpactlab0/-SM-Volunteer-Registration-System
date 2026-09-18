@echo off
setlocal
cd /d "%~dp0"
title CLASP Setup

echo ========================================
echo 01 - Install CLASP project tools
echo ========================================
echo.
echo Working folder:
echo %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js LTS first.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found.
  echo Please reinstall Node.js LTS.
  echo.
  pause
  exit /b 1
)

echo [OK] Node.js:
node --version
echo [OK] npm:
call npm.cmd --version
echo.

echo Installing project packages...
call npm.cmd install
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\clasp.cmd" (
  echo.
  echo [ERROR] CLASP was not installed.
  echo File not found: node_modules\.bin\clasp.cmd
  pause
  exit /b 1
)

echo.
echo [OK] CLASP:
call "node_modules\.bin\clasp.cmd" --version
echo.
echo ========================================
echo Installation completed.
echo Next: run step 02 login.
echo ========================================
pause
endlocal
