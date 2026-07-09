@echo off
title osrs-bot
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0.tools\run-dev.ps1"
echo.
echo (osrs-bot closed. Press a key to exit this window.)
pause >nul
