@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

rem Thin wrapper — logic in scripts\run-local.ps1 (tranh loi ^ khi goi tu PowerShell)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-local.ps1"
set "EC=%ERRORLEVEL%"
endlocal & exit /b %EC%
