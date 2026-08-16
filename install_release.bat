@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-prebuilt.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation failed with error code %ERRORLEVEL%.
)
echo.
pause
