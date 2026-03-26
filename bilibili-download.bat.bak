@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "URL=%~1"
set "QUALITY=%~2"

if "%URL%"=="" (
    echo 用法: bilibili-download.bat ^<url^> [质量]
    echo 示例: bilibili-download.bat https://www.bilibili.com/video/BV1xx411c7mD 1080p
    exit /b 1
)

if "%QUALITY%"=="" set "QUALITY=best"

set "FFMPEG=C:\Users\JINLONG\Downloads\ffmpeg-8.1-full_build\bin\ffmpeg.exe"
set "YTDLP=C:\Users\JINLONG\AppData\Local\Programs\Python\Python314\Scripts\yt-dlp.exe"
set "DOWNLOAD_DIR=C:\Users\JINLONG\Downloads"

echo ==========================================
echo   Bilibili 视频下载器
echo ==========================================
echo URL: %URL%
echo 质量: %QUALITY%
echo ==========================================

echo 获取视频信息...
for /f "delims=" %%i in ('"%YTDLP%" --get-title --no-playlist "%URL%" 2^>nul') do set "TITLE=%%i"
echo 标题: %TITLE%

:: 清理标题中的非法字符 (Windows文件名)
set "CLEAN_TITLE=%TITLE%"
set "CLEAN_TITLE=%CLEAN_TITLE:\=_%"
set "CLEAN_TITLE=%CLEAN_TITLE:/=_%"
set "CLEAN_TITLE=%CLEAN_TITLE::*=_%"
set "CLEAN_TITLE=%CLEAN_TITLE:?=_%"
set "CLEAN_TITLE=%CLEAN_TITLE:"=_%"
set "CLEAN_TITLE=%CLEAN_TITLE:\==_%"
set "CLEAN_TITLE=%CLEAN_TITLE:>=_%"
set "CLEAN_TITLE=%CLEAN_TITLE:<=_%"
set "CLEAN_TITLE=%CLEAN_TITLE:|=_%"

set "OUTPUT_FILE=%DOWNLOAD_DIR%\%CLEAN_TITLE%.mp4"
set "TEMP_OUTPUT=%DOWNLOAD_DIR%\_temp_merge.mp4"
set "VIDEO_FILE=%DOWNLOAD_DIR%\_video_temp.mp4"
set "AUDIO_FILE=%DOWNLOAD_DIR%\_audio_temp.m4a"

echo 开始下载...

:: 下载视频 (av1格式)
"%YTDLP%" -f 100026 --output "%VIDEO_FILE%" --no-playlist --no-warnings "%URL%" >nul 2>&1
if errorlevel 1 (
    echo 错误: 视频下载失败
    exit /b 1
)

:: 下载音频
"%YTDLP%" -f 30280 --output "%AUDIO_FILE%" --no-playlist --no-warnings "%URL%" >nul 2>&1
if errorlevel 1 (
    echo 错误: 音频下载失败
    del "%VIDEO_FILE%" 2>nul
    exit /b 1
)

echo 视频和音频下载完成，开始合并...

:: 合并视频和音频
"%FFMPEG%" -hide_banner -loglevel error -i "%VIDEO_FILE%" -i "%AUDIO_FILE%" -c copy -y "%TEMP_OUTPUT%" >nul 2>&1

if errorlevel 1 (
    echo 错误: 合并失败
    exit /b 1
)

:: 重命名为最终文件名
move /y "%TEMP_OUTPUT%" "%OUTPUT_FILE%" >nul 2>&1

:: 删除临时文件
del "%VIDEO_FILE%" "%AUDIO_FILE%" 2>nul

echo.
echo ==========================================
echo   下载完成！
echo ==========================================
echo 文件: %OUTPUT_FILE%
dir "%OUTPUT_FILE%" | findstr /i ".mp4"
