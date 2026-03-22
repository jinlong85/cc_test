#!/usr/bin/env python3
"""
章若楠 4K 图片自动下载脚本
功能：下载章若楠高质量图片到桌面
"""

import subprocess
from pathlib import Path
import re

# 配置
DESKTOP = Path.home() / "Desktop"
DOWNLOAD_DIR = DESKTOP / "zhang_ruonan_4k"
TARGET_COUNT = 20

# 创建目录
DOWNLOAD_DIR.mkdir(exist_ok=True)

# 章若楠高质量图片URL (来自Bing搜索结果)
IMAGE_URLS = [
    ("https://c8.alamy.com/comp/3A5RN00/chinese-actress-zhang-ruonan-attends-the-2025-television-series-of-china-quality-ceremony-in-shanghai-china-19-march-2025-3A5RN00.jpg", "zhang_ruonan_01.jpg"),
    ("https://c8.alamy.com/comp/2B7K99C/chinese-actress-zhang-ruonan-attends-2019-jinri-toutiao-fashion-gala-in-beijing-china-8-january-2020-2B7K99C.jpg", "zhang_ruonan_02.jpg"),
    ("https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgtATFECNUKQK5ycnzQikm9Gw4dpI0loe7Y6OM4Jd5TKrkoMSH6qlU2eNucyiezCvxfSAqDLgJgR2KsyJklFld1rk-RNSF2gSc6qO5fnn5RbQ0eXwctSnF8g9nte9qTXsvpvBqkUkzGaI6m/s0/zhangRuonan5.jpeg", "zhang_ruonan_03.jpg"),
    ("https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh1ijbiWe9kEKl-QjN96LE77fZbxppQbiuZUrxbBxlXlzrRYipj1bb91QiE2McegSufjgDi2dw-inphH6nyBupIEqzfK4TEbE1scfiQ1vEStmH0N7orZWMZt938X0uY15rM_dz8Qbif34aAD98O6JBJKlDvvWlMZypNv_dKAo8kz9NCG8VDRN0yZrivUKP_/s1600/ZhangRuonan2.jpeg", "zhang_ruonan_04.jpg"),
    ("https://p1-tt.byteimg.com/origin/tos-cn-i-qvj2lq49k0/e86cfe5cf0e848de83622c9a18d48d6e.jpg", "zhang_ruonan_05.jpg"),
    ("https://i.pinimg.com/originals/e6/cf/9a/e6cf9a7d53da6fe1ea73ae357f40e082.jpg", "zhang_ruonan_06.jpg"),
    ("https://c8.alamy.com/comp/2PMFYH4/shanghai-china-11th-apr-2023-chinese-actress-zhang-ruonan-attended-the-activity-in-shanghai-china-11th-apr-2023-photo-by-chinaimagessipa-usa-credit-sipa-usalamy-live-news-2PMFYH4.jpg", "zhang_ruonan_07.jpg"),
    ("https://c8.alamy.com/comp/2B7K99D/chinese-actress-zhang-ruonan-attends-2019-jinri-toutiao-fashion-gala-in-beijing-china-8-january-2020-2B7K99D.jpg", "zhang_ruonan_08.jpg"),
    ("https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgzAq0znMN1uaYx4jF0561tiQICohUedgph8BnIqaZd4mE0nTuFjGtBXCBfb0JtILaUi7swtSAtPr9f3GffHdDzd5Xb8eWRlrlSjmwrz1tBo9ex2YGYQJTlk46ir1_9HcVm3cKf7kFyfs8m/s0/ZhangRuonan6.jpg", "zhang_ruonan_09.jpg"),
    ("https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgJzz_9NfMSJlaeOjLDdKsdahmH14Hj7dNEvXUC4KE3qQUSpic-jHAg7EN-kmSevCd0bMsFNYL-RQDg2123MW5f1_T6FOZMGQ6PC1J0ANBiKPqyxTWxRPbuuNE3WB0JNQ2LzzDEGrGXoyF0Jx7RpV1AWXCtfO5E6NiAkxbqPJccnmdprGdgzUUGJtgG3Xg/s1600/ZhangRuonan_tencent4.jpg", "zhang_ruonan_10.jpg"),
    ("https://www.cpophome.com/wp-content/uploads/2021/07/Zhang-Ruonan-1.jpg", "zhang_ruonan_11.jpg"),
    ("https://c8.alamy.com/comp/2T3MB2B/chinese-actress-zhang-ruonan-attends-an-activity-in-shanghai-china-24th-oct-2023-photo-by-chinaimagessipa-usa-credit-sipa-usalamy-live-news-2T3MB2B.jpg", "zhang_ruonan_12.jpg"),
    ("https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi9x21dumCRDZwecPUY5_pKLbnl-OfEHTY9weE42f7Ue-xNqzJZgwp9k68GU8QUL_R6MrS371NeW8-4TsV7YvHRlEpVJnZlQ2X6t7pkjE7LYVBliWhRs7VlK9Cbw7rVdf0wREkaUhWZGNvB/s0/zhangRuonan3.jpeg", "zhang_ruonan_13.jpg"),
    ("https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgHEtYjm0cSLStBTvhjtiB7caji8uBcb2ssIPzdVa4G3Bp3a6VpX9szHNtXw20uYV8MSWqpvpgz7IJrYsQ4Sqmo4-UoBzkUdAZpZYcsuzXe9yqe1Z29X1cTb1jmz7DP1kaghXFuwd8nTgOFOIhRiw1DAqbtSL_QvozM0gYhQ9Gm_Ivsk9LMnFNImYl-KQ/s1600/ZhangRuonan4.jpg", "zhang_ruonan_14.jpg"),
    ("https://c8.alamy.com/comp/2SXD5GN/chinese-actress-zhang-ruonan-attends-an-activity-in-beijing-china-20-february-2025-2SXD5GN.jpg", "zhang_ruonan_15.jpg"),
    ("https://image.tmdb.org/t/p/original/1P84p4yKTiEs4ZDBpnN3z99BiRc.jpg", "zhang_ruonan_16.jpg"),
    ("https://www.globalgranary.life/wp-content/uploads/2019/07/D88TsW2VsAAbnr3.jpg", "zhang_ruonan_17.jpg"),
    ("https://p5-tt.byteimg.com/origin/pgc-image/a5b76bf866684e299b48b07906037ab5.jpg", "zhang_ruonan_18.jpg"),
    ("https://c8.alamy.com/comp/2T3MAD1/chinese-actress-zhang-ruonan-attends-an-activity-in-shanghai-china-24-october-2023-photo-by-chinaimagessipa-usa-2T3MAD1.jpg", "zhang_ruonan_19.jpg"),
    ("https://i.mydramalist.com/E5kBmm_5_c.jpg", "zhang_ruonan_20.jpg"),
]

def download_image(url, filepath):
    """下载单张图片"""
    try:
        result = subprocess.run(
            ["curl", "-s", "-L", "-o", str(filepath), url],
            capture_output=True, text=True, timeout=30
        )
        return filepath.exists() and filepath.stat().st_size > 5000
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
        matches = re.findall(r'(\d+)x(\d+)', output)
        if matches:
            w, h = matches[-1]
            return int(w), int(h)
    except Exception:
        pass
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
    print("  章若楠 4K 图片自动下载脚本")
    print("=" * 50)
    print(f"下载目录: {DOWNLOAD_DIR}")
    print(f"目标数量: {TARGET_COUNT} 张")
    print()

    downloaded = []

    print("开始下载图片...\n")

    for url, filename in IMAGE_URLS[:TARGET_COUNT]:
        filepath = DOWNLOAD_DIR / filename

        print(f"下载: {filename}...", end=" ", flush=True)
        if download_image(url, filepath):
            width, height = get_resolution(filepath)
            quality = check_quality(width, height)
            print(f"{width}x{height} [{quality}]")

            if quality != "LOW":
                downloaded.append((filepath, quality))
            else:
                filepath.unlink(missing_ok=True)
        else:
            print("失败")

    # 统计
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

    desktop_files = list(DESKTOP.glob("zhang_ruonan_*.jpg")) + list(DESKTOP.glob("zhang_ruonan_*.png"))
    print(f"桌面章若楠图片总数: {len(desktop_files)} 张")
    print()
    print("完成!")

if __name__ == "__main__":
    main()
