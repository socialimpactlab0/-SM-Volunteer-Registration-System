@echo off
setlocal
cd /d "%~dp0"
title CLASP Login

echo ========================================
echo 02 - Login to Google CLASP
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\clasp.cmd" (
  echo [ERROR] CLASP is not installed in this folder.
  echo Run step 01 first.
  pause
  exit /b 1
)

echo [OK] CLASP:
call "node_modules\.bin\clasp.cmd" --version
echo.
echo A browser window should open for Google authorization.
echo Keep this console window open.
echo.

call "node_modules\.bin\clasp.cmd" login
if errorlevel 1 (
  echo.
  echo [ERROR] CLASP login failed.
  pause
  exit /b 1
)

echo.
echo Authorized Google account:
call "node_modules\.bin\clasp.cmd" show-authorized-user
echo.
echo Login completed. Next: run step 03.
pause
endlocal
