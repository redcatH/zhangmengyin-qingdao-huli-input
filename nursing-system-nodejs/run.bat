@echo off
chcp 65001 >nul
title 护理入住登记系统 - Node.js重构版本

echo.
echo ================================================
echo           护理入住登记自动化系统  
echo              Node.js 重构版本
echo ================================================
echo.

REM 检查Node.js环境
echo [1/5] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到Node.js，请先安装Node.js 16+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js环境检查通过
    node --version
)

echo.
echo [2/5] 检查npm环境...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: npm未正确安装
    pause
    exit /b 1
) else (
    echo ✅ npm环境检查通过
    npm --version
)

echo.
echo [3/5] 安装依赖包...
npm install --no-audit --no-fund
if errorlevel 1 (
    echo ❌ 错误: 依赖包安装失败
    echo 请检查网络连接或尝试使用国内镜像：
    echo npm config set registry https://registry.npmmirror.com/
    pause
    exit /b 1
) else (
    echo ✅ 依赖包安装完成
)

echo.
echo [4/5] 环境检查...
if not exist config.json (
    echo ⚠️  警告: 未找到config.json配置文件，将使用默认配置
) else (
    echo ✅ 配置文件检查通过
)

if not exist "入住表（刘毅用）9月.xls" (
    echo ⚠️  警告: 未找到Excel输入文件
    echo 请确保Excel文件与系统在同一目录，或修改config.json中的文件路径
    echo 当前查找文件: 入住表（刘毅用）9月.xls
) else (
    echo ✅ Excel文件检查通过
)

echo.
echo [5/5] 启动系统...
echo ================================================
echo 系统正在启动，请等待...
echo ================================================
echo.

REM 启动系统
node src/main.js

echo.
echo ================================================
echo 系统运行完成
echo ================================================
echo.

REM 检查生成的文件
if exist error.log (
    echo 📄 错误日志文件: error.log
)

if exist successfulUsers.json (
    echo 📄 成功用户记录: successfulUsers.json
)

REM 检查报告文件
for %%f in (*_report_*.json) do (
    echo 📊 处理报告: %%f
)

REM 检查人员数据文件
if exist nurseObjs.json (
    echo 📋 护士数据: nurseObjs.json
)
if exist doctorObjs.json (
    echo 📋 医生数据: doctorObjs.json
)
if exist caregiverObjs.json (
    echo 📋 护理员数据: caregiverObjs.json
)

echo.
echo 💡 提示:
echo   - 查看error.log了解详细的错误信息
echo   - 查看*_report_*.json了解完整的处理报告
echo   - 修改config.json可以调整系统参数
echo.
echo 按任意键退出...
pause >nul
