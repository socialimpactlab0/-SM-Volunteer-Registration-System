@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo ========================================
echo 03 建立新的 Google Sheet + GAS 專案
echo ========================================
if exist ".clasp.json" (
  echo [停止] 已存在 .clasp.json，表示此資料夾已綁定 GAS 專案。
  echo 如要使用既有專案，請直接執行 04_上傳到_GAS.bat
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo [錯誤] 請先執行 01_安裝_clasp.bat
  pause
  exit /b 1
)

rem clasp create 會建立 appsscript.json，先備份本專案 manifest
copy /Y "src\appsscript.json" "%TEMP%\sm_volunteer_appsscript.json" >nul
call npx clasp create-script --type sheets --title "2027 台南神韻義工活動報名系統" --rootDir src
if errorlevel 1 (
  echo [失敗] GAS 專案建立失敗。
  if exist "%TEMP%\sm_volunteer_appsscript.json" copy /Y "%TEMP%\sm_volunteer_appsscript.json" "src\appsscript.json" >nul
  pause
  exit /b 1
)
if exist "%TEMP%\sm_volunteer_appsscript.json" copy /Y "%TEMP%\sm_volunteer_appsscript.json" "src\appsscript.json" >nul

echo.
echo [完成] 已建立 Google Sheet + Apps Script，並產生 .clasp.json。
echo 下一步請執行 04_上傳到_GAS.bat
pause
