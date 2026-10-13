@echo off
chcp 65001 >nul
title 数学题图解工坊 - 本地服务器
echo.
echo   正在启动本地服务器（浏览器会自动打开）...
echo   关闭这个窗口即可停止服务。
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8123
if errorlevel 1 pause
