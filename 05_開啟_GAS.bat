@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".clasp.json" (
  echo [錯誤] 找不到 .clasp.json。
  pause
  exit /b 1
)
call npx clasp open-script
