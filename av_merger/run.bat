@echo off
chcp 65001 >nul
echo ========================================
echo    音频视频合并工具
echo ========================================
echo.

:: 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

:: 检查ffmpeg
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [警告] 未找到ffmpeg，请确保已安装并添加到PATH
    echo 下载地址: https://ffmpeg.org/download.html
    echo.
    pause
)

echo .
python av_merger.py

pause
