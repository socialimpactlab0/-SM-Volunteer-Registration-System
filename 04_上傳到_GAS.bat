@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo 04 將 GitHub/本機程式上傳到 GAS
echo ========================================
if not exist ".clasp.json" (
  echo [錯誤] 找不到 .clasp.json。
  echo 新專案請先執行 03_建立_GAS專案.bat。
  echo 既有 GAS 專案請依 README 建立 .clasp.json。
  pause
  exit /b 1
)
call npx clasp push --force
if errorlevel 1 (
  echo [失敗] clasp push 未成功。
  pause
  exit /b 1
)
echo.
echo [完成] 程式已上傳到 Google Apps Script。
echo 可執行 05_開啟_GAS.bat 開啟專案。
pause
