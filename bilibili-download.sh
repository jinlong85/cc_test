#!/bin/bash
# Bilibili Video Downloader - 基于 yt-dlp
# 使用方式: ./bilibili-download.sh <url> [质量] [输出目录]

set -e

URL="$1"
QUALITY="${2:-best}"
OUTPUT_DIR="${3:-.}"

if [ -z "$URL" ]; then
    echo "用法: $0 <url> [质量] [输出目录]"
    echo ""
    echo "质量选项: 8k, 4k, 1080p, 720p, 480p, 360p, best, worst"
    echo "示例: $0 https://www.bilibili.com/video/BV1xx411c7mD 1080p ~/Videos"
    exit 1
fi

echo "=========================================="
echo "  Bilibili 视频下载器"
echo "=========================================="
echo "URL: $URL"
echo "质量: $QUALITY"
echo "输出: $OUTPUT_DIR"
echo "=========================================="

case "$QUALITY" in
    8k|4k|1080p|720p|480p|360p)
        FORMAT="bestvideo[height<=$QUALITY]+bestaudio/best[height<=$QUALITY]"
        ;;
    best)
        FORMAT="bestvideo+bestaudio/best"
        ;;
    worst)
        FORMAT="worstvideo+worstaudio/worst"
        ;;
    *)
        FORMAT="bestvideo+bestaudio/best"
        ;;
esac

echo "开始下载..."
yt-dlp \
    -f "$FORMAT" \
    --output "$OUTPUT_DIR/%(title)s/%(section_title)s/%(title)s-%(id)s.%(ext)s" \
    --merge-output-format mp4 \
    --no-playlist \
    --progress \
    "$URL"

echo ""
echo "下载完成!"
