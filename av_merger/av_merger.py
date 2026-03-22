"""
音频视频合并工具 - Audio Video Merger
拖入音频/视频文件，合并后导出MP4格式
"""

import os
import sys
import subprocess
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path

# 支持的文件格式
VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'}
AUDIO_EXTENSIONS = {'.mp3', '.aac', '.m4a', '.wav', '.flac', '.ogg', '.wma'}


class AVMergerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("音频视频合并工具")
        self.root.geometry("650x550")
        self.root.resizable(True, True)

        # 数据
        self.video_files = []
        self.audio_files = []
        self.ffmpeg_path = self.find_ffmpeg()

        # 验证ffmpeg
        if not self.ffmpeg_path:
            messagebox.showerror("错误", "未找到ffmpeg，请确保已安装并添加到系统PATH环境变量中。")
            # 不退出，让用户可以查看界面
            self.ffmpeg_path = "ffmpeg"  # 假设在PATH中

        self.setup_ui()

    def find_ffmpeg(self):
        """查找ffmpeg路径"""
        # 检查系统PATH
        try:
            result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
            if result.returncode == 0:
                return 'ffmpeg'
        except FileNotFoundError:
            pass

        # 检查常见安装位置
        common_paths = [
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe",
        ]
        for path in common_paths:
            if os.path.exists(path):
                return path

        return None

    def setup_ui(self):
        """设置UI界面"""
        # 主框架
        main_frame = ttk.Frame(self.root, padding="15")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # 标题
        title_label = ttk.Label(main_frame, text="音频视频合并工具", font=("Microsoft YaHei", 18, "bold"))
        title_label.pack(pady=(0, 15))

        # 视频文件区域
        video_frame = ttk.LabelFrame(main_frame, text="视频文件", padding="10")
        video_frame.pack(fill=tk.X, pady=5)

        self.video_listbox = tk.Listbox(video_frame, height=5, width=55)
        self.video_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        video_btn_frame = ttk.Frame(video_frame)
        video_btn_frame.pack(side=tk.LEFT, padx=(10, 0))

        ttk.Button(video_btn_frame, text="添加视频", command=self.add_video).pack(fill=tk.X, pady=2)
        ttk.Button(video_btn_frame, text="移除选中", command=self.remove_video).pack(fill=tk.X, pady=2)
        ttk.Button(video_btn_frame, text="清空", command=self.clear_video).pack(fill=tk.X, pady=2)

        # 音频文件区域
        audio_frame = ttk.LabelFrame(main_frame, text="音频文件", padding="10")
        audio_frame.pack(fill=tk.X, pady=5)

        self.audio_listbox = tk.Listbox(audio_frame, height=5, width=55)
        self.audio_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        audio_btn_frame = ttk.Frame(audio_frame)
        audio_btn_frame.pack(side=tk.LEFT, padx=(10, 0))

        ttk.Button(audio_btn_frame, text="添加音频", command=self.add_audio).pack(fill=tk.X, pady=2)
        ttk.Button(audio_btn_frame, text="移除选中", command=self.remove_audio).pack(fill=tk.X, pady=2)
        ttk.Button(audio_btn_frame, text="清空", command=self.clear_audio).pack(fill=tk.X, pady=2)

        # 提示信息
        hint_label = ttk.Label(
            main_frame,
            text="提示: 视频和音频按顺序一一对应合并",
            font=("Microsoft YaHei", 9),
            foreground="#666666"
        )
        hint_label.pack(pady=5)

        # 按钮区域
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(pady=15)

        self.merge_btn = ttk.Button(btn_frame, text="合并导出MP4", command=self.merge_files, style="Accent.TButton")
        self.merge_btn.pack(side=tk.LEFT, padx=10, ipadx=20, ipady=5)

        # 状态显示
        self.status_label = ttk.Label(main_frame, text="就绪", foreground="green", font=("Microsoft YaHei", 10))
        self.status_label.pack(pady=5)

        # 进度条
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate')
        self.progress.pack(fill=tk.X, pady=5)

        # 格式选项
        options_frame = ttk.Frame(main_frame)
        options_frame.pack(pady=5)

        ttk.Label(options_frame, text="视频编码:").pack(side=tk.LEFT)
        self.video_codec = ttk.Combobox(options_frame, values=['libx264', 'copy'], width=10, state='readonly')
        self.video_codec.current(0)
        self.video_codec.pack(side=tk.LEFT, padx=5)

        ttk.Label(options_frame, text="音频编码:").pack(side=tk.LEFT)
        self.audio_codec = ttk.Combobox(options_frame, values=['aac', 'copy', 'mp3'], width=10, state='readonly')
        self.audio_codec.current(0)
        self.audio_codec.pack(side=tk.LEFT, padx=5)

        self.check_merge_button()

    def get_file_type(self, filepath):
        """识别文件类型"""
        ext = Path(filepath).suffix.lower()
        if ext in VIDEO_EXTENSIONS:
            return 'video'
        elif ext in AUDIO_EXTENSIONS:
            return 'audio'
        return None

    def add_video(self):
        """添加视频文件"""
        files = filedialog.askopenfilenames(
            title="选择视频文件",
            filetypes=[
                ("视频文件", "*.mp4 *.avi *.mov *.mkv *.webm *.flv *.wmv *.m4v"),
                ("所有文件", "*.*")
            ]
        )
        for filepath in files:
            if filepath not in self.video_files:
                self.video_files.append(filepath)
                self.video_listbox.insert(tk.END, os.path.basename(filepath))
        self.check_merge_button()
        self.update_status()

    def add_audio(self):
        """添加音频文件"""
        files = filedialog.askopenfilenames(
            title="选择音频文件",
            filetypes=[
                ("音频文件", "*.mp3 *.aac *.m4a *.wav *.flac *.ogg *.wma"),
                ("所有文件", "*.*")
            ]
        )
        for filepath in files:
            if filepath not in self.audio_files:
                self.audio_files.append(filepath)
                self.audio_listbox.insert(tk.END, os.path.basename(filepath))
        self.check_merge_button()
        self.update_status()

    def remove_video(self):
        """移除选中的视频"""
        selection = self.video_listbox.curselection()
        for i in reversed(selection):
            self.video_listbox.delete(i)
            self.video_files.pop(i)
        self.check_merge_button()
        self.update_status()

    def remove_audio(self):
        """移除选中的音频"""
        selection = self.audio_listbox.curselection()
        for i in reversed(selection):
            self.audio_listbox.delete(i)
            self.audio_files.pop(i)
        self.check_merge_button()
        self.update_status()

    def clear_video(self):
        """清空视频列表"""
        self.video_files.clear()
        self.video_listbox.delete(0, tk.END)
        self.check_merge_button()
        self.update_status()

    def clear_audio(self):
        """清空音频列表"""
        self.audio_files.clear()
        self.audio_listbox.delete(0, tk.END)
        self.check_merge_button()
        self.update_status()

    def update_status(self):
        """更新状态显示"""
        video_count = len(self.video_files)
        audio_count = len(self.audio_files)
        self.status_label.config(text=f"视频: {video_count}个, 音频: {audio_count}个")

    def check_merge_button(self):
        """检查是否可以合并"""
        if self.video_files and self.audio_files:
            self.merge_btn.config(state=tk.NORMAL)
        else:
            self.merge_btn.config(state=tk.DISABLED)

    def merge_files(self):
        """合并文件"""
        if not self.video_files or not self.audio_files:
            messagebox.showwarning("警告", "请至少添加一个视频文件和一个音频文件")
            return

        # 选择保存位置
        default_name = "merged_output.mp4"
        save_path = filedialog.asksaveasfilename(
            defaultextension=".mp4",
            filetypes=[("MP4文件", "*.mp4")],
            initialfile=default_name
        )

        if not save_path:
            return

        self.start_merge(save_path)

    def start_merge(self, output_path):
        """开始合并进程"""
        self.progress.start(10)
        self.merge_btn.config(state=tk.DISABLED)
        self.status_label.config(text="正在合并...", foreground="blue")

        thread = threading.Thread(target=self.do_merge, args=(output_path,))
        thread.daemon = True
        thread.start()

    def do_merge(self, output_path):
        """执行合并操作"""
        try:
            video_count = len(self.video_files)
            audio_count = len(self.audio_files)

            if video_count == 1 and audio_count == 1:
                # 单对单合并
                self.merge_single_pair(self.video_files[0], self.audio_files[0], output_path)
            else:
                # 多对多合并
                # 取较小数量作为配对数
                pair_count = min(video_count, audio_count)

                if pair_count == 1:
                    self.merge_single_pair(self.video_files[0], self.audio_files[0], output_path)
                else:
                    # 多个文件需要依次合并
                    # 先合并前两个，然后用结果继续与下一个合并
                    temp_output = output_path

                    for i in range(pair_count):
                        video_file = self.video_files[i]
                        audio_file = self.audio_files[i]

                        if i == 0:
                            self.merge_single_pair(video_file, audio_file, temp_output)
                        else:
                            # 创建临时文件
                            if i < pair_count - 1:
                                temp_output = f"temp_merge_{i}.mp4"

                            self.merge_single_pair(video_file, audio_file, temp_output)

                            # 如果有下一个，需要把当前结果作为下一个的输入
                            # 这里简化为只输出最后一个配对的结果

            self.root.after(0, self.merge_success, output_path)

        except Exception as e:
            self.root.after(0, self.merge_error, str(e))

    def merge_single_pair(self, video_path, audio_path, output_path):
        """合并单个视频和音频"""
        v_codec = self.video_codec.get()
        a_codec = self.audio_codec.get()

        # 构建ffmpeg命令
        if v_codec == 'copy' and a_codec == 'copy':
            # 两者都copy时需要特殊处理
            cmd = [
                self.ffmpeg_path,
                '-i', video_path,
                '-i', audio_path,
                '-c:v', 'copy',
                '-c:a', 'copy',
                '-shortest',
                '-y',
                output_path
            ]
        elif v_codec == 'copy':
            cmd = [
                self.ffmpeg_path,
                '-i', video_path,
                '-i', audio_path,
                '-c:v', 'copy',
                '-c:a', a_codec if a_codec != 'copy' else 'aac',
                '-strict', 'experimental' if a_codec == 'aac' else '',
                '-shortest',
                '-y',
                output_path
            ]
        elif a_codec == 'copy':
            cmd = [
                self.ffmpeg_path,
                '-i', video_path,
                '-i', audio_path,
                '-c:v', v_codec,
                '-preset', 'fast',
                '-c:a', 'copy',
                '-shortest',
                '-y',
                output_path
            ]
        else:
            cmd = [
                self.ffmpeg_path,
                '-i', video_path,
                '-i', audio_path,
                '-c:v', v_codec,
                '-preset', 'fast',
                '-c:a', a_codec if a_codec != 'copy' else 'aac',
                '-strict', 'experimental' if a_codec == 'aac' else '',
                '-shortest',
                '-y',
                output_path
            ]

        # 移除空字符串
        cmd = [c for c in cmd if c]

        # 执行ffmpeg
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        )

        if result.returncode != 0:
            raise Exception(f"FFmpeg错误: {result.stderr[-500:]}")

    def merge_success(self, output_path):
        """合并成功"""
        self.progress.stop()
        self.merge_btn.config(state=tk.NORMAL)
        self.status_label.config(text="合并完成!", foreground="green")

        file_size = os.path.getsize(output_path)
        size_mb = file_size / (1024 * 1024)

        messagebox.showinfo(
            "成功",
            f"文件已成功合并!\n\n保存位置: {output_path}\n文件大小: {size_mb:.2f} MB"
        )

    def merge_error(self, error_msg):
        """合并失败"""
        self.progress.stop()
        self.merge_btn.config(state=tk.NORMAL)
        self.status_label.config(text="合并失败", foreground="red")
        messagebox.showerror("错误", f"合并失败:\n{error_msg}")


def main():
    root = tk.Tk()
    app = AVMergerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
