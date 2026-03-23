#!/bin/bash
# Bilibili Video Downloader - 基于 yt-dlp
# 使用方式: ./bilibili-download.sh <url> [质量]
# 输出目录: C:/Users/JINLONG/Downloads

set -e

URL="$1"
QUALITY="${2:-best}"

if [ -z "$URL" ]; then
    echo "用法: $0 <url> [质量]"
    echo ""
    echo "质量选项: 8k, 4k, 1080p, 720p, 480p, 360p, best"
    echo "示例: $0 https://www.bilibili.com/video/BV1xx411c7mD 1080p"
    exit 1
fi

echo "=========================================="
echo "  Bilibili 视频下载器"
echo "=========================================="
echo "URL: $URL"
echo "质量: $QUALITY"
echo "=========================================="

# 通过cmd.exe执行yt-dlp
get_title() {
    cmd.exe /c "C:\\Users\\JINLONG\\AppData\\Local\\Programs\\Python\\Python314\\Scripts\\yt-dlp.exe --get-title --no-playlist \"$URL\"" 2>/dev/null | head -1
}

download_video() {
    cmd.exe /c "C:\\Users\\JINLONG\\AppData\\Local\\Programs\\Python\\Python314\\Scripts\\yt-dlp.exe -f \"bestvideo[ext=mp4]\" --output \"C:\\Users\\JINLONG\\Downloads\\_video_temp.mp4\" --no-playlist --no-warnings \"$URL\"" 2>&1 || true
}

download_audio() {
    cmd.exe /c "C:\\Users\\JINLONG\\AppData\\Local\\Programs\\Python\\Python314\\Scripts\\yt-dlp.exe -f \"bestaudio[ext=m4a]\" --output \"C:\\Users\\JINLONG\\Downloads\\_audio_temp.m4a\" --no-playlist --no-warnings \"$URL\"" 2>&1 || true
}

merge_video() {
    cmd.exe /c "C:\\Users\\JINLONG\\Downloads\\ffmpeg-8.1-full_build\\bin\\ffmpeg.exe -hide_banner -loglevel error -i \"C:\\Users\\JINLONG\\Downloads\\_video_temp.mp4\" -i \"C:\\Users\\JINLONG\\Downloads\\_audio_temp.m4a\" -c copy -y \"$OUTPUT_FILE\"" 2>&1
}

cleanup() {
    cmd.exe /c "del /f \"C:\\Users\\JINLONG\\Downloads\\_video_temp.mp4\" \"C:\\Users\\JINLONG\\Downloads\\_audio_temp.m4a\" 2>nul" 2>/dev/null || true
}

echo "获取视频信息..."
TITLE=$(get_title)
echo "标题: $TITLE"

# 清理标题中的非法字符 (Windows文件名)
CLEAN_TITLE=$(echo "$TITLE" | sed 's/[\\/:*?"<>|]/_/g')

# 输出文件 (使用Windows路径格式)
OUTPUT_FILE="C:\\Users\\JINLONG\\Downloads\\${CLEAN_TITLE}.mp4"

echo "开始下载..."
download_video
download_audio

# 检查文件是否存在
VIDEO_EXISTS=$(cmd.exe /c "if exist \"C:\\Users\\JINLONG\\Downloads\\_video_temp.mp4\" (echo yes) else (echo no)" 2>/dev/null)
AUDIO_EXISTS=$(cmd.exe /c "if exist \"C:\\Users\\JINLONG\\Downloads\\_audio_temp.m4a\" (echo yes) else (echo no)" 2>/dev/null)

if [ "$VIDEO_EXISTS" != "yes" ] || [ "$AUDIO_EXISTS" != "yes" ]; then
    echo "错误: 下载失败"
    cleanup
    exit 1
fi

echo "视频和音频下载完成，开始合并..."
merge_video

# 删除临时文件
cleanup

echo ""
echo "=========================================="
echo "  下载完成！"
echo "=========================================="
echo "文件: $OUTPUT_FILE"
cmd.exe /c "dir \"$OUTPUT_FILE\"" 2>/dev/null | grep -E "mp4|字节|bytes"
