@echo off
chcp 65001 >nul
title mathviz - LAN server
echo.
echo   Starting LAN server...
echo   Devices on the SAME Wi-Fi can open the printed http://192.168.x.x:PORT/ address.
echo   If Windows Firewall asks, tick "Private networks" and click Allow.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8123 -Lan
if errorlevel 1 pause
