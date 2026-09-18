@echo off
set "HERE=%~dp0"
start "CLASP Login - Keep Open" cmd.exe /k "cd /d ""%HERE%"" && echo CLASP diagnostic console opened. && echo. && if exist ""02_登入_clasp_新版.bat"" (call ""02_登入_clasp_新版.bat"") else (echo ERROR: 02_登入_clasp_新版.bat not found. && echo Please put both files in the same folder.)"
exit /b
