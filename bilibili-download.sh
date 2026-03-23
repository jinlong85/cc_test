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

# FFmpeg路径
FFMPEG="C:/Users/JINLONG/Downloads/ffmpeg-8.1-full_build/bin/ffmpeg.exe"
YTDLP="C:/Users/JINLONG/AppData/Local/Programs/Python/Python314/Scripts/yt-dlp.exe"

# 质量格式映射
case "$QUALITY" in
    8k|4k|1080p|720p|480p|360p)
        FORMAT="bestvideo[height<=$QUALITY]+bestaudio/best[height<=$QUALITY]"
        ;;
    best)
        FORMAT="bestvideo+bestaudio/best"
        ;;
    *)
        FORMAT="bestvideo+bestaudio/best"
        ;;
esac

# 下载目录
DOWNLOAD_DIR="C:/Users/JINLONG/Downloads"

# 临时文件
VIDEO_FILE="$DOWNLOAD_DIR/_video_temp.mp4"
AUDIO_FILE="$DOWNLOAD_DIR/_audio_temp.m4a"

echo "获取视频信息..."
# 获取标题
TITLE=$("$YTDLP" --get-title --no-playlist "$URL" 2>/dev/null | head -1)
echo "标题: $TITLE"

# 清理标题中的非法字符 (Windows文件名)
CLEAN_TITLE=$(echo "$TITLE" | sed 's/[\\/:*?"<>|]/_/g')

# 输出文件
OUTPUT_FILE="$DOWNLOAD_DIR/${CLEAN_TITLE}.mp4"

echo "开始下载..."

# 下载视频（分离格式）
"$YTDLP" \
    -f "bestvideo[ext=mp4]" \
    --output "$VIDEO_FILE" \
    --no-playlist \
    --no-warnings \
    "$URL" 2>&1 || true

# 下载音频
"$YTDLP" \
    -f "bestaudio[ext=m4a]" \
    --output "$AUDIO_FILE" \
    --no-playlist \
    --no-warnings \
    "$URL" 2>&1 || true

# 检查文件是否存在
if [ ! -f "$VIDEO_FILE" ] || [ ! -f "$AUDIO_FILE" ]; then
    echo "错误: 下载失败"
    exit 1
fi

echo "视频和音频下载完成，开始合并..."

# 合并视频和音频
"$FFMPEG" -hide_banner -loglevel error \
    -i "$VIDEO_FILE" \
    -i "$AUDIO_FILE" \
    -c copy \
    -y "$OUTPUT_FILE"

# 删除临时文件
rm -f "$VIDEO_FILE" "$AUDIO_FILE"

echo ""
echo "=========================================="
echo "  下载完成！"
echo "=========================================="
echo "文件: $OUTPUT_FILE"
ls -lh "$OUTPUT_FILE"
