@echo off
chcp 65001 >nul
title mathviz - local server
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8123
if errorlevel 1 pause
