@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-offline.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation failed with error code %ERRORLEVEL%.
)
echo.
pause
