@echo off
setlocal
cd /d "%~dp0"
title CLASP Login

echo ========================================
echo 02 - Google CLASP Login
echo ========================================
echo.
echo Project folder:
echo %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please run 01_安裝_clasp.bat first and confirm Node.js is installed.
  echo.
  pause
  goto :end
)

echo [OK] Node.js:
node --version
echo.

if not exist "node_modules\.bin\clasp.cmd" (
  echo [ERROR] node_modules\.bin\clasp.cmd was not found.
  echo Please run 01_安裝_clasp.bat first.
  echo.
  pause
  goto :end
)

echo [OK] clasp found:
call "node_modules\.bin\clasp.cmd" --version
echo.

echo Browser login will start now.
echo Please sign in to Google and approve access.
echo Do NOT close this window.
echo.
call "node_modules\.bin\clasp.cmd" login
set "LOGIN_ERR=%ERRORLEVEL%"
echo.

if not "%LOGIN_ERR%"=="0" (
  echo [ERROR] clasp login failed. Error code: %LOGIN_ERR%
  echo.
  pause
  goto :end
)

echo ========================================
echo Login completed.
echo Current authorized Google account:
echo ========================================
call "node_modules\.bin\clasp.cmd" show-authorized-user
echo.
echo You can now run 03_建立_GAS專案.bat
echo.
pause

:end
endlocal
