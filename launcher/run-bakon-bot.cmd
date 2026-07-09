@echo off
title bakon-bot
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0.tools\run-dev.ps1"
echo.
echo (bakon-bot closed. Press a key to exit this window.)
pause >nul
