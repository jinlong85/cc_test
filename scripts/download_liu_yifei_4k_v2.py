#!/usr/bin/env python3
"""
刘亦菲 4K 图片自动下载脚本 v2
功能：从已验证的高质量图片源下载刘亦菲4K图片
"""

import os
import subprocess
from pathlib import Path
import re

# 配置
DESKTOP = Path.home() / "Desktop"
DOWNLOAD_DIR = DESKTOP / "liu_yifei_4k"
TARGET_COUNT = 10

# 创建目录
DOWNLOAD_DIR.mkdir(exist_ok=True)

# 已验证的刘亦菲高质量图片URL (来自之前的成功下载)
VERIFIED_URLS = [
    # 真正高清的刘亦菲图片
    ("https://www.gethucinema.com/tmdb/rXtN9j6pnMsMb8D016NXV40tFv0.jpg", "liu_yifei_01.jpg"),  # 2000x3000
    ("https://p1-tt.byteimg.com/origin/tos-cn-i-qvj2lq49k0/2d9aabc50ca64c5fbc6a385549827d77.jpg", "liu_yifei_02.jpg"),  # 2000x2878
    ("https://p1-tt.byteimg.com/origin/tos-cn-i-qvj2lq49k0/a80044828f904bb6a1cb492e5690e6d2.jpg", "liu_yifei_03.jpg"),  # 2048x3072
    ("https://media1.popsugar-assets.com/files/thumbor/f2LB6nHeNbppaHSrPE23_D34zYg/0x231:3280x3511/fit-in/2048xorig/filters:format_auto-!!-:strip_icc-!!-/2020/07/13/907/n/44344577/056352f45f0cc83065db78.03833758_/i/Liu-Yifei.jpg", "liu_yifei_04.jpg"),  # 2048x2048

    # 额外的4K级别图片源
    ("https://i.pinimg.com/originals/41/a1/59/41a159010baea757243102b083f844a8.jpg", "liu_yifei_05.jpg"),
    ("https://p1-tt.byteimg.com/origin/tos-cn-i-qvj2lq49k0/b61fab940dc94bec914840af6a6be9fc.jpg", "liu_yifei_06.jpg"),
    ("https://p1-tt.byteimg.com/origin/tos-cn-i-qvj2lq49k0/a6285e8ebd8d44c0aee4279042f027ab.jpg", "liu_yifei_07.jpg"),
    ("https://p1-tt.byteimg.com/origin/tos-cn-i-qvj2lq49k0/1e9051cfd1734705b3503e2fd8e923a6.jpg", "liu_yifei_08.jpg"),
    ("https://ilarge.lisimg.com/image/27060049/740full-yifei-liu.jpg", "liu_yifei_09.jpg"),
    ("https://celebmafia.com/wp-content/uploads/2024/10/liu-yifei-at-louis-vuitton-ss25-show-at-paris-fashion-week-10-01-2024-4.jpg", "liu_yifei_10.jpg"),
]

def download_image(url, filepath):
    """下载单张图片"""
    try:
        result = subprocess.run(
            ["curl", "-s", "-L", "-o", str(filepath), url],
            capture_output=True, text=True, timeout=30
        )
        return filepath.exists() and filepath.stat().st_size > 10000
    except Exception as e:
        print(f"下载失败: {e}")
        return False

def get_resolution(filepath):
    """获取图片分辨率"""
    try:
        result = subprocess.run(
            ["file", str(filepath)],
            capture_output=True, text=True
        )
        output = result.stdout
        # 提取分辨率
        matches = re.findall(r'(\d+)x(\d+)', output)
        if matches:
            # 返回最后一个匹配（通常是主图分辨率）
            w, h = matches[-1]
            return int(w), int(h)
    except Exception as e:
        print(f"获取分辨率失败: {e}")
    return 0, 0

def check_quality(width, height):
    """检查图片质量"""
    if width >= 3840 or height >= 2160:
        return "4K"
    elif width >= 2048 or height >= 1536:
        return "2K+"
    elif width >= 1920 or height >= 1080:
        return "FHD"
    else:
        return "LOW"

def main():
    print("=" * 50)
    print("  刘亦菲 4K 图片自动下载脚本 v2")
    print("=" * 50)
    print(f"下载目录: {DOWNLOAD_DIR}")
    print(f"目标数量: {TARGET_COUNT} 张")
    print()

    downloaded = []
    success_count = 0

    print("开始下载图片...\n")

    for url, filename in VERIFIED_URLS[:TARGET_COUNT]:
        filepath = DOWNLOAD_DIR / filename

        # 下载
        print(f"下载: {filename}...", end=" ", flush=True)
        if download_image(url, filepath):
            width, height = get_resolution(filepath)
            quality = check_quality(width, height)
            print(f"{width}x{height} [{quality}]")

            if quality != "LOW":
                downloaded.append((filepath, quality))
                success_count += 1
            else:
                print(f"  -> 质量太低，删除")
                filepath.unlink(missing_ok=True)
        else:
            print("失败")

    # 移动高质量图片到桌面
    k4_count = sum(1 for _, q in downloaded if q == "4K")
    k2_count = sum(1 for _, q in downloaded if q == "2K+")
    fhd_count = sum(1 for _, q in downloaded if q == "FHD")

    print()
    print("=" * 50)
    print("  下载完成 - 统计")
    print("=" * 50)
    print(f"4K 图片: {k4_count} 张")
    print(f"2K+ 图片: {k2_count} 张")
    print(f"FHD 图片: {fhd_count} 张")
    print()

    # 移动高质量图片到桌面
    if downloaded:
        print("移动高质量图片到桌面...")
        for filepath, quality in downloaded:
            dest = DESKTOP / filepath.name
            subprocess.run(["cp", str(filepath), str(dest)])
            print(f"  ✓ {filepath.name} ({quality})")
        print()

    # 桌面统计
    desktop_files = list(DESKTOP.glob("liu_yifei_*.jpg")) + list(DESKTOP.glob("liu_yifei_*.png"))
    print(f"桌面刘亦菲图片总数: {len(desktop_files)} 张")
    print()
    print("完成!")

if __name__ == "__main__":
    main()
