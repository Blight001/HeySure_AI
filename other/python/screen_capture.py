import cv2
import numpy as np
from mss import mss
import threading
import time


class ScreenCapture:
    """
    屏幕捕获类，用于实时获取屏幕画面帧
    """
    
    def __init__(self, monitor_index=1, scale_factor=0.5):
        """
        初始化屏幕捕获器
        
        Args:
            monitor_index (int): 要捕获的显示器索引，默认为1（主显示器）
            scale_factor (float): 窗口初始缩放因子，默认为0.5
        """
        self.monitor_index = monitor_index
        self.scale_factor = scale_factor
        self.frame = None
        self.running = False
        self.capture_thread = None
        self.window_name = 'Screen Capture'
        self.monitor = None
        self.window_created = False
        
    def start_capture(self, show_window=True):
        """
        开始捕获屏幕画面
        
        Args:
            show_window (bool): 是否显示捕获窗口
        """
        self.running = True
        self.show_window = show_window
        
        # 启动捕获线程
        self.capture_thread = threading.Thread(target=self._capture_loop)
        self.capture_thread.daemon = True
        self.capture_thread.start()
    
    def stop_capture(self):
        """
        停止捕获屏幕画面
        """
        self.running = False
        if self.capture_thread:
            self.capture_thread.join()
        cv2.destroyAllWindows()
    
    def _capture_loop(self):
        """
        内部捕获循环
        """
        # 在线程内部创建mss实例以避免线程安全问题
        with mss() as sct:
            self.monitor = sct.monitors[self.monitor_index]
            
            while self.running:
                # 捕获屏幕
                img = sct.grab(self.monitor)
                self.frame = np.array(img)
                self.frame = cv2.cvtColor(self.frame, cv2.COLOR_BGRA2BGR)
                
                # 如果需要显示窗口
                if self.show_window:
                    # 在捕获到第一帧后再创建窗口，确保窗口正确显示
                    if not self.window_created:
                        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
                        self.window_created = True
                    
                    if self.window_created:
                        cv2.imshow(self.window_name, self.frame)
                        
                        # 设置窗口初始大小
                        if cv2.getWindowProperty(self.window_name, cv2.WND_PROP_AUTOSIZE) != -1:
                            cv2.resizeWindow(self.window_name, 
                                           int(self.frame.shape[1] * self.scale_factor), 
                                           int(self.frame.shape[0] * self.scale_factor))
                            # 只在第一次设置窗口大小
                            cv2.setWindowProperty(self.window_name, cv2.WND_PROP_AUTOSIZE, -1)
                    
                    # 检查是否按下了 'q' 键或者窗口被关闭
                    key = cv2.waitKey(1) & 0xFF
                    if key == ord('q') or cv2.getWindowProperty(self.window_name, cv2.WND_PROP_VISIBLE) < 1:
                        self.running = False
    
    def get_frame(self):
        """
        获取当前帧
        
        Returns:
            numpy.ndarray: 当前帧图像数据，如果没有帧则返回None
        """
        return self.frame
    
    def get_fps(self, duration=5):
        """
        测试并返回捕获帧率
        
        Args:
            duration (int): 测试持续时间（秒）
            
        Returns:
            float: 平均帧率
        """
        frame_count = 0
        start_time = time.time()
        
        while time.time() - start_time < duration:
            if self.get_frame() is not None:
                frame_count += 1
            time.sleep(0.01)  # 短暂休眠以减少CPU使用
            
        elapsed_time = time.time() - start_time
        fps = frame_count / elapsed_time
        return fps


def main():
    """
    示例用法
    """
    # 创建屏幕捕获器实例
    capture = ScreenCapture()
    
    # 开始捕获（显示窗口）
    capture.start_capture(show_window=True)
    
    try:
        # 等待用户按下 'q' 键或关闭窗口
        while capture.running:
            # 可以在这里处理当前帧
            frame = capture.get_frame()
            if frame is not None:
                # 示例：打印当前帧的尺寸
                print(f"当前帧尺寸: {frame.shape}", end='\r')
            
            time.sleep(0.01)  # 短暂休眠以减少CPU使用
    except KeyboardInterrupt:
        print("\n用户中断程序")
    finally:
        # 停止捕获
        capture.stop_capture()
        print("屏幕捕获已停止")


if __name__ == "__main__":
    main()