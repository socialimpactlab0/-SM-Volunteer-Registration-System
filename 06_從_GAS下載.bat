@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo 06 從 GAS 下載最新版程式
echo 注意：會更新本機 src 內容
echo ========================================
if not exist ".clasp.json" (
  echo [錯誤] 找不到 .clasp.json。
  pause
  exit /b 1
)
call npx clasp pull
pause
