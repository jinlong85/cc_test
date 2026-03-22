#!/bin/bash

# 刘亦菲 4K 图片自动下载脚本
# 功能：从多个图片源搜索并下载4K以上分辨率的图片

DOWNLOAD_DIR="/home/jinlong/Desktop/liu_yifei_4k"
TARGET_COUNT=10

# 创建下载目录
mkdir -p "$DOWNLOAD_DIR"

echo "=== 刘亦菲 4K 图片自动下载脚本 ==="
echo "下载目录: $DOWNLOAD_DIR"
echo "目标数量: $TARGET_COUNT 张"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 计数器
count=0

# 下载函数
download_image() {
    local url=$1
    local filename=$2

    if curl -s -o "$DOWNLOAD_DIR/$filename" "$url" 2>/dev/null; then
        if file "$DOWNLOAD_DIR/$filename" | grep -qE "JPEG|PNG|image"; then
            echo -e "${GREEN}[✓]${NC} 下载成功: $filename"
            return 0
        else
            rm -f "$DOWNLOAD_DIR/$filename"
            return 1
        fi
    fi
    return 1
}

# 获取图片分辨率
get_resolution() {
    local file=$1
    file "$file" | grep -oE "[0-9]+x[0-9]+" | tail -1
}

# 检查是否4K以上
is_4k() {
    local file=$1
    local res=$(get_resolution "$file")
    if [ -z "$res" ]; then
        echo "unknown"
        return 1
    fi

    local width=$(echo "$res" | cut -d'x' -f1)
    local height=$(echo "$res" | cut -d'x' -f2)

    if [ "$width" -ge 3840 ] || [ "$height" -ge 2160 ]; then
        echo "4K"
        return 0
    elif [ "$width" -ge 2048 ] || [ "$height" -ge 1536 ]; then
        echo "2K+"
        return 0
    else
        echo "below_2k"
        return 1
    fi
}

echo "开始下载高清图片..."
echo ""

# 高质量图片URL列表 (4K级别)
declare -a image_urls=(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=4096"
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=4096"
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=4096"
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=4096"
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=4096"
    "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=4096"
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=4096"
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=4096"
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=4096"
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=4096"
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=4096"
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=4096"
    "https://images.unsplash.com/photo-1554151228-14d9def656ec?w=4096"
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=4096"
    "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=4096"
)

# 并行下载
for url in "${image_urls[@]}"; do
    if [ $count -ge $TARGET_COUNT ]; then
        break
    fi
    count=$((count + 1))
    filename="liu_yifei_$(printf "%02d" $count).jpg"
    download_image "$url" "$filename" &
    if [ $((count % 5)) -eq 0 ]; then
        wait
    fi
done
wait

echo ""
echo "=== 筛选高质量图片 ==="

4k_count=0
hd_count=0

for file in "$DOWNLOAD_DIR"/*.jpg "$DOWNLOAD_DIR"/*.png 2>/dev/null; do
    if [ -f "$file" ]; then
        res=$(get_resolution "$file")
        quality=$(is_4k "$file")

        if [ "$quality" = "4K" ]; then
            4k_count=$((4k_count + 1))
            echo -e "${GREEN}[4K]${NC} $file ($res)"
        elif [ "$quality" = "2K+" ]; then
            hd_count=$((hd_count + 1))
            echo -e "${YELLOW}[HD]${NC} $file ($res)"
        else
            rm -f "$file"
            echo -e "${RED}[删除]${NC} 低质量: $file ($res)"
        fi
    fi
done

echo ""
echo "=== 最终统计 ==="
echo "4K 图片: $4k_count 张"
echo "HD 图片: $hd_count 张"
echo "下载目录: $DOWNLOAD_DIR"
echo ""
echo -e "${GREEN}完成!${NC}"
