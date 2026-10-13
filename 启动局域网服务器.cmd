@echo off
chcp 65001 >nul
title 数学题图解工坊 - 局域网服务器
echo.
echo   正在启动局域网服务器...
echo   同一个 WiFi / 局域网下的手机、平板、电脑都可以访问。
echo   第一次启动如果弹出 Windows 防火墙提示，请勾选「专用网络」再点「允许访问」。
echo   关闭这个窗口即可停止服务。
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8123 -Lan
if errorlevel 1 pause
