---
allowed-tools: Bash
description: 下载YouTube视频到Windows桌面（最高画质4K，自动合并音视频）
---

## Context

YouTube URL: {{$input}}

## 任务

下载 YouTube 视频到 Windows 桌面（最高画质），自动合并音视频为 MP4 格式，文件名与视频标题一致。

## 下载步骤

1. 获取视频标题:
```bash
/tmp/yt-dlp --js-runtimes node --get-title "URL"
```

2. 查看可用格式:
```bash
/tmp/yt-dlp --js-runtimes node -F "URL" | tail -30
```

3. 尝试直接下载 4K 并合并:
```bash
TITLE=$(/tmp/yt-dlp --js-runtimes node --get-title "URL" | tr '[:space:]' '_' | tr -d '/:*?"<>|')
/tmp/yt-dlp --js-runtimes node --no-part -f "313+140" --merge-output-format mp4 -o "/mnt/d/Users/JINLONG/Desktop/${TITLE}.%(ext)s" "URL"
```

4. 如果上面失败（HTTP 500错误），分开下载:
```bash
TITLE=$(/tmp/yt-dlp --js-runtimes node --get-title "URL" | tr '[:space:]' '_' | tr -d '/:*?"<>|')

# 下载VP9 4K视频
/tmp/yt-dlp --js-runtimes node --no-part -f "313" -o "/mnt/d/Users/JINLONG/Desktop/${TITLE}_video.webm" "URL"

# 下载音频
/tmp/yt-dlp --js-runtimes node --no-part -f "140" -o "/mnt/d/Users/JINLONG/Desktop/${TITLE}_audio.m4a" "URL"
```

5. 使用 ffmpeg 合并:
```bash
TITLE=$(/tmp/yt-dlp --js-runtimes node --get-title "URL" | tr '[:space:]' '_' | tr -d '/:*?"<>|')
export LD_LIBRARY_PATH=/tmp/ffmpeg-master-latest-linux64-gpl-shared/lib:$LD_LIBRARY_PATH
/tmp/ffmpeg-master-latest-linux64-gpl-shared/bin/ffmpeg -i "/mnt/d/Users/JINLONG/Desktop/${TITLE}_video.webm" -i "/mnt/d/Users/JINLONG/Desktop/${TITLE}_audio.m4a" -c copy -shortest "/mnt/d/Users/JINLONG/Desktop/${TITLE}.mp4"
```

6. 清理临时文件:
```bash
rm -f /mnt/d/Users/JINLONG/Desktop/*_video.webm /mnt/d/Users/JINLONG/Desktop/*_audio.m4a
```

7. 确认最终文件:
```bash
ls -lh /mnt/d/Users/JINLONG/Desktop/*.mp4 | tail -5
```

请完整执行下载流程，并告诉我最终文件信息（文件名、大小、分辨率、时长）。
