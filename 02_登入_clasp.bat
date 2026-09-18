@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo 02 登入 Google clasp
echo ========================================
if not exist "node_modules" (
  echo [錯誤] 尚未安裝 clasp，請先執行 01_安裝_clasp.bat
  pause
  exit /b 1
)
call npx clasp login
if errorlevel 1 (
  echo [失敗] clasp 登入未完成。
  pause
  exit /b 1
)
echo.
call npx clasp show-authorized-user
pause
