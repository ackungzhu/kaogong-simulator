@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   上岸模拟器 · 本地服务器启动
echo ================================================
echo.
echo 服务器将在 http://localhost:8765/ 运行
echo 游戏地址: http://localhost:8765/index.html
echo.
echo 关闭本窗口即停止服务器
echo ================================================
echo.
start "" "http://localhost:8765/index.html"
python serve_nocache.py
pause
