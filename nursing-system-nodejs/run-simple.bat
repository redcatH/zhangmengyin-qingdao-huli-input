@echo off
chcp 65001 >nul
title 护理入住登记系统启动

echo.
echo ================================================
echo           护理入住登记系统启动
echo ================================================
echo.

echo [1/4] 检查Node.js...
node --version
if errorlevel 1 (
    echo 错误: 未找到Node.js
    pause
    exit /b 1
)

echo.
echo [2/4] 检查npm...
npm --version
if errorlevel 1 (
    echo 错误: npm未正确安装
    pause
    exit /b 1
)

echo.
echo [3/4] 安装依赖...
npm install --no-audit --no-fund
if errorlevel 1 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [4/4] 启动系统...
echo ================================================
node src/main.js

echo.
echo 系统运行完成，按任意键退出...
pause >nul
