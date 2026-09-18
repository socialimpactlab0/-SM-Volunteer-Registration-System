@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo 01 安裝 clasp 專案工具
echo ========================================
where node >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js。
  echo 請先安裝 Node.js LTS，再重新執行。
  pause
  exit /b 1
)
call npm install
if errorlevel 1 (
  echo [失敗] npm install 沒有成功。
  pause
  exit /b 1
)
echo.
echo [完成] clasp 已安裝在此專案。
call npx clasp --version
pause
