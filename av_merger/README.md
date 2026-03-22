# 音频视频合并工具 (Audio Video Merger)

一个简单的Windows工具，用于拖入音频和视频文件，合并后导出MP4格式。

## 环境要求

1. **Python 3.8+**
2. **ffmpeg** - 必须安装并添加到系统PATH

## 安装依赖

```bash
pip install -r requirements.txt
```

## 使用方法

1. 运行程序：
   ```bash
   python av_merger.py
   ```

2. 拖拽文件到窗口：
   - 支持的视频格式: .mp4, .avi, .mov, .mkv, .webm, .flv
   - 支持的音频格式: .mp3, .aac, .m4a, .wav, .flac, .ogg

3. 程序会自动识别：
   - 拖入视频 → 识别为视频文件
   - 拖入音频 → 识别为音频文件
   - 如果同时拖入多个文件，会自动配对合并

4. 点击"合并导出"按钮，选择保存位置

## 功能说明

- 自动检测拖入文件的类型（视频/音频）
- 支持多文件拖入，自动配对
- 使用ffmpeg进行高质量合并
- 输出格式：MP4 (H.264视频 + AAC音频)
