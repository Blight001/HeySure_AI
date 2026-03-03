"""
脚本名称: 屏幕矩形框显示工具 (BoxDisplay)
描述:
    该脚本提供了一个基于 Tkinter 的屏幕覆盖层功能，用于在屏幕指定位置绘制矩形框。
    为了避免 GUI 事件循环阻塞主程序或引发线程安全问题，该工具设计为通过子进程独立运行。
    它既可以作为模块导入调用，也可以通过命令行参数直接运行。

    核心功能:
    1. show_box(top, left, width, height, ...): 
       - 启动一个独立的 Python 进程来显示矩形框。
       - 支持设置显示位置、大小、持续时间、颜色以及额外的子框标记。
       - 使用 JSON 序列化参数并通过命令行传递给子进程。

    2. 独立进程架构:
       - 避免了 "Object of type Thread is not JSON serializable" 等 IPC 问题。
       - 解决了 Tkinter 在非主线程运行时的 "CoInitialize" 或 "main thread" 限制。
       - 确保提示框的显示不会因为主程序的繁忙或退出而异常中断。
"""

import tkinter as tk
import numpy as np
import sys
import os
import json
import argparse
import subprocess
import ctypes

def _draw_box_logic(top, left, width, height, duration, color, sub_boxes):
    """
    实际执行绘图的逻辑
    """
    try:
        # 启用高DPI感知，确保坐标和尺寸单位为物理像素，解决Win10/11下缩放导致尺寸过大的问题
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            try:
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass

        root = tk.Tk()
        root.overrideredirect(True)
        root.attributes('-topmost', True)
        # 获取屏幕尺寸，覆盖全屏透明窗口
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        root.geometry(f"{screen_width}x{screen_height}+0+0")
        
        # 设置透明背景 (Windows特定)
        # 使用特定的几乎全黑的颜色作为透明键，防止纯黑色(black)的内容被误透明化
        transparent_color = '#010101'
        root.attributes('-transparentcolor', transparent_color)
        root.config(bg=transparent_color)

        canvas = tk.Canvas(root, bg=transparent_color, highlightthickness=0)
        canvas.pack(fill=tk.BOTH, expand=True)

        # 绘制主框
        canvas.create_rectangle(
            left, top, left + width, top + height,
            outline=color, width=3, fill=''
        )

        # 处理子框
        if sub_boxes is not None:
            for box in sub_boxes:
                try:
                    points = np.array(box)
                    # 简单校验形状
                    if hasattr(points, 'shape') and points.shape != (4, 2):
                         # 尝试容错处理
                         pass

                    # 确保是numpy数组以便计算
                    points = np.array(box)
                    
                    # 坐标转换：加上主框左上角偏移
                    screen_points = points + [left, top]
                    
                    x_coords = screen_points[:, 0]
                    y_coords = screen_points[:, 1]
                    x_min, x_max = x_coords.min(), x_coords.max()
                    y_min, y_max = y_coords.min(), y_coords.max()
                    
                    canvas.create_rectangle(
                        x_min, y_min, x_max, y_max,
                        outline='yellow', width=1
                    )
                except Exception as e:
                    print(f"绘制子框失败: {e}")

        # 设置定时关闭
        root.after(duration, root.destroy)
        root.mainloop()
    except Exception as e:
        print(f"BoxDisplay Process Error: {e}")

def show_box(top, left, width, height, duration=1000, color='red', sub_boxes=None):
    """
    显示屏幕矩形框
    :param top: 矩形框左上角y坐标
    :param left: 矩形框左上角x坐标
    :param width: 矩形框宽度
    :param height: 矩形框高度
    :param duration: 显示持续时间(毫秒)
    :param color: 矩形框颜色
    :param sub_boxes: 子框列表，用于标识关键词等细节部分
    """
    # 获取当前脚本的绝对路径
    current_script = os.path.abspath(__file__)
    
    # 构造参数字典
    args_dict = {
        'top': top,
        'left': left,
        'width': width,
        'height': height,
        'duration': duration,
        'color': color,
        'sub_boxes': sub_boxes
    }
    
    # 将参数序列化为 JSON 字符串
    try:
        args_json = json.dumps(args_dict)
    except Exception as e:
        print(f"Error serializing arguments for BoxDisplay: {e}")
        return "NO"

    # 使用 subprocess 启动新进程
    # 使用 sys.executable 确保使用相同的 Python 解释器
    try:
        subprocess.Popen(
            [sys.executable, current_script, '--args', args_json],
            close_fds=True,  # 在 Linux/Mac 上有用，Windows 上默认 False 但通常没问题
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0 # 避免弹出控制台窗口
        )
    except Exception as e:
        print(f"Error launching BoxDisplay process: {e}")
        
    return "OK"

if __name__ == "__main__":
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='Display a box overlay on the screen.')
    parser.add_argument('--args', type=str, help='JSON string containing all arguments')
    
    args = parser.parse_args()
    
    if args.args:
        try:
            params = json.loads(args.args)
            _draw_box_logic(
                top=params.get('top'),
                left=params.get('left'),
                width=params.get('width'),
                height=params.get('height'),
                duration=params.get('duration', 1000),
                color=params.get('color', 'red'),
                sub_boxes=params.get('sub_boxes')
            )
        except json.JSONDecodeError:
            print("Invalid JSON arguments provided.")
        except Exception as e:
            print(f"Error in BoxDisplay main execution: {e}")
    else:
        print("No arguments provided. Usage: python BoxDisplay.py --args '{\"top\": 100, ...}'")
