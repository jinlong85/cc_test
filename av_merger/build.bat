@echo off
chcp 65001 >nul
echo ========================================
echo    构建exe文件
echo ========================================
echo.

:: 检查pyinstaller
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo 安装PyInstaller中...
    pip install pyinstaller
)

:: 构建exe
pyinstaller --onefile --windowed --name "AV合并工具" av_merger.py

echo.
echo 构建完成！exe文件在 dist 目录中
pause
