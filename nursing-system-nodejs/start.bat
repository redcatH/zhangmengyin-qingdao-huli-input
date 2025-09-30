@echo off
chcp 65001 >nul
title 护理入住登记系统

echo.
echo ================================================
echo           护理入住登记系统启动
echo ================================================
echo.

echo 正在启动系统...
node src/main.js

echo.
echo 按任意键退出...
pause >nul
