
import serial
import threading
import time
import random
import ctypes
 
import logging
if not logging.getLogger().hasHandlers():
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s - %(message)s',
        handlers=[
            # logging.FileHandler("app.log", encoding='utf-8'),  # 写入日志文件
            logging.StreamHandler()  # 同时输出到控制台
        ]
    )

# 定义 POINT 结构体
class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.wintypes.LONG),
                ("y", ctypes.wintypes.LONG)]


class CH9329Controller:
    def __init__(self, com_port='COM46', baudrate=9600):
        """初始化串口连接"""
        self.ser = serial.Serial(
            port=com_port,
            baudrate=baudrate,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            bytesize=serial.EIGHTBITS,
            timeout=0.5  # 500ms超时符合协议要求
        )
        self.user32 = ctypes.windll.user32
        
        self.target_position = [0, 0]  # 绝对目标位置
        self.delta_position = [0, 0]   # 相对移动量
        self.mouse_button = 0          # 鼠标按键（0x01左键/0x02右键/0x04中键）
        self.wheel = 0                 # 滚轮值（正上滚，负下滚）
        self.keyboard_button = None    # 待发送的字符
        self.time_delay = (0.05, 0.15, 0.10)   # 随机延时范围(low, high, mode) → mode 是最可能的值
        self.move_speed = 35           # 鼠标移动速度
        self.current_position = list(self.get_mouse_position()) # 当前鼠标位置
        self.running = True            # 控制线程运行状态
        self.scale = 0.4

        # 启动拟人化线程
        threading.Thread(target=self.thread_Action_HumanLike, daemon=True).start()

    def _calculate_sum(self, data_bytes):
        """计算累加和（低8位）"""
        return sum(data_bytes) & 0xFF

    def send_command(self, cmd_code, data_bytes):
        """通用命令发送函数"""
        head = [0x57, 0xAB]
        addr = [0x00]  # 默认地址码
        cmd = [cmd_code]
        data_len = [len(data_bytes)]
        
        full_frame = head + addr + cmd + data_len + data_bytes
        check_sum = [self._calculate_sum(full_frame)]
        frame_bytes = bytes(full_frame + check_sum)
        
        self.ser.write(frame_bytes)
        return self._receive_response(cmd_code)

    def _receive_response(self, original_cmd):
        """接收并解析应答包"""
        head = self.ser.read(2)
        if head != b'\x57\xab':
            return {"status": "error", "reason": "无效帧头"}
        
        addr = self.ser.read(1)
        resp_cmd = self.ser.read(1)
        data_len = self.ser.read(1)[0]
        data = self.ser.read(data_len)
        check_sum = self.ser.read(1)

        cmd_value = resp_cmd[0]
        if cmd_value == (original_cmd | 0x80):
            return {"status": "success", "data": data}
        elif cmd_value == (original_cmd | 0xC0):
            status_code = data[0] if data else 0xEE
            status_map = {
                0xE1: "接收超时",
                0xE2: "帧头错误",
                0xE3: "命令码错误",
                0xE4: "校验和错误",
                0xE5: "参数错误",
                0xE6: "执行失败"
            }
            return {"status": "error", "reason": status_map.get(status_code, "未知错误")}
        return {"status": "error", "reason": "无效应答命令码"}

    def get_mouse_position(self):
            point = POINT()
            if self.user32.GetCursorPos(ctypes.byref(point)):
                return point.x, point.y
            else:
                raise ctypes.WinError()
            
    #----------------键盘控制相关方法----------------
    def press_key(self, char_input=None, ctrl_keys=0x00, key_codes=[0x00]*6):
        """
        模拟键盘按键（支持字符输入）
        char_input: 直接输入字符（如 'A', 'a', '!', '1'）
        ctrl_keys: 控制键位掩码（8位，每位对应Ctrl/Shift/Alt等）
        key_codes: 6个普通按键码列表（每个0-0xFF，0表示无按键）
        """
        if char_input:
            char = char_input.upper()
            shift_needed = char.islower()
            char = char.upper()
            
            char_to_code = {
                'A': 0x04, 'B': 0x05, 'C': 0x06, 'D': 0x07, 'E': 0x08,
                'F': 0x09, 'G': 0x0A, 'H': 0x0B, 'I': 0x0C, 'J': 0x0D,
                'K': 0x0E, 'L': 0x0F, 'M': 0x10, 'N': 0x11, 'O': 0x12,
                'P': 0x13, 'Q': 0x14, 'R': 0x15, 'S': 0x16, 'T': 0x17,
                'U': 0x18, 'V': 0x19, 'W': 0x1A, 'X': 0x1B, 'Y': 0x1C,
                'Z': 0x1D,
                '1': 0x1E, '2': 0x1F, '3': 0x20, '4': 0x21, '5': 0x22,
                '6': 0x23, '7': 0x24, '8': 0x25, '9': 0x26, '0': 0x27,
                '!': 0x1E, '@': 0x1F, '#': 0x20, '$': 0x21, '%': 0x22,
                '^': 0x23, '&': 0x24, '*': 0x25, '(': 0x26, ')': 0x27,
            }

            code = char_to_code.get(char, 0x00)
            if code == 0x00:
                logging.info(f"警告：字符 '{char}' 未找到对应键码")
                return {"status": "error", "reason": "无效字符"}

            if shift_needed:
                ctrl_keys |= 0x10  # 设置Shift位

            key_codes = [code] + [0x00]*5  # 只发送一个按键

        # 构造8字节数据
        data = [ctrl_keys, 0x00] + key_codes[:6]
        data += [0x00]*(8 - len(data))  # 补充0到8字节
        return self.send_command(0x02, data)

    #----------------鼠标控制相关方法----------------
    def move_mouse_rel(self, buttons=0x00, dx=0, dy=0, wheel=0):
        """
        模拟鼠标相对移动
        buttons: 鼠标按键位掩码（低3位：左/右/中键）
        dx: X方向移动量（正数右移，负数左移）
        dy: Y方向移动量（正数下移，负数上移）
        wheel: 滚轮滚动量（正数上滚，负数下滚）
        """
        dx_byte = dx & 0xFF if dx >=0 else (0x100 + dx) & 0xFF
        dy_byte = dy & 0xFF if dy >=0 else (0x100 + dy) & 0xFF
        wheel_byte = wheel & 0xFF if wheel >=0 else (0x100 + wheel) & 0xFF
        
        data = [0x01, buttons, dx_byte, dy_byte, wheel_byte]
        return self.send_command(0x05, data)  # CMD_SEND_MS_REL_DATA

    def move_mouse_rel_batch(self, moves):
        """
        批量发送鼠标相对移动命令
        moves: [(buttons, dx, dy, wheel), ...]
        """
        frames = []
        for buttons, dx, dy, wheel in moves:
            dx_byte = dx & 0xFF if dx >= 0 else (0x100 + dx) & 0xFF
            dy_byte = dy & 0xFF if dy >= 0 else (0x100 + dy) & 0xFF
            wheel_byte = wheel & 0xFF if wheel >= 0 else (0x100 + wheel) & 0xFF
            data = [0x01, buttons, dx_byte, dy_byte, wheel_byte]
            
            head = [0x57, 0xAB]
            addr = [0x00]
            cmd = [0x05]
            data_len = [len(data)]
            full_frame = head + addr + cmd + data_len + data
            check_sum = [self._calculate_sum(full_frame)]
            frame_bytes = bytes(full_frame + check_sum)
            frames.append(frame_bytes)
        
        self.ser.write(b''.join(frames))
        return {"status": "success"}  # 批量发送时不等待应答

    #----------------拟人化操作----------------
    def _humanize_offset(self, value, no_jitter_prob=0.95):#拟人化抖动，支持配置无抖动概率
        """添加拟人化抖动，支持配置无抖动概率
        
        Args:
            value: 原始值
            no_jitter_prob: 不抖动的概率，例如 0.8 表示 80%
        """
        jitter_prob = (1 - no_jitter_prob) / 2  # -1 和 +1 各占一半
        jitter = random.choices(
            population=[-1, 0, 1],
            weights=[jitter_prob, no_jitter_prob, jitter_prob]
        )[0]
        return value + jitter

    def generate_moves(self, dx, dy, buttons=0x00, wheel=0, steps=1):#生成先快后慢的移动步骤，并支持位移缩放
        """生成先快后慢的移动步骤，并支持位移缩放
        
        Args:
            dx (int): 总X位移
            dy (int): 总Y位移
            buttons (int): 按钮状态
            wheel (int): 滚轮状态
            steps (int): 分多少步完成移动
            scale (float): 位移缩放因子，>1.0 放大，<1.0 缩小，默认为 1.0（无缩放）
        
        Returns:
            list: [(buttons, dx, dy, wheel), ...]
        """
        moves = []
        accumulated_dx = 0
        accumulated_dy = 0

        # 应用缩放到总位移
        scaled_dx = dx * self.scale
        scaled_dy = dy * self.scale

        # 预计算每个步骤的归一化时间 t ∈ [0, 1]
        target_positions = []
        for step in range(steps):
            if steps == 1:
                t = 1.0
            else:
                t = step / (steps - 1)  # t from 0 to 1

            # 使用 ease-out 曲线：先快后慢（减速）
            speed_ratio = 1.0 - (1.0 - t) ** 2  # 可替换为其他 ease-out 函数

            target_x = scaled_dx * speed_ratio
            target_y = scaled_dy * speed_ratio
            target_positions.append((target_x, target_y))
        
        for step in range(steps):
            target_x, target_y = target_positions[step]
            
            # 计算这一步应移动的增量（浮点）
            dx_step_float = target_x - accumulated_dx
            dy_step_float = target_y - accumulated_dy
            
            # 四舍五入为整数位移
            dx_step = int(round(dx_step_float))
            dy_step = int(round(dy_step_float))
            
            # 拟人化抖动（注意：_humanize_offset 应处理小范围随机扰动）
            dx_step = self._humanize_offset(dx_step)
            dy_step = self._humanize_offset(dy_step)
            
            # 防止抖动导致越界（自修正）
            remaining_dx = scaled_dx - accumulated_dx
            remaining_dy = scaled_dy - accumulated_dy
            
            if abs(dx_step) > abs(remaining_dx):
                dx_step = int(remaining_dx) if remaining_dx >= 0 else int(-remaining_dx)
            if abs(dy_step) > abs(remaining_dy):
                dy_step = int(remaining_dy) if remaining_dy >= 0 else int(-remaining_dy)
            
            accumulated_dx += dx_step
            accumulated_dy += dy_step
            
            moves.append((buttons, dx_step, dy_step, wheel))
            
            # 最后一步补足误差（防止浮点/取整导致未到位）
            if step == steps - 1:
                final_dx = int(round(scaled_dx - accumulated_dx))
                final_dy = int(round(scaled_dy - accumulated_dy))
                if final_dx != 0 or final_dy != 0:
                    # 修改最后一步
                    buttons_last, dx_last, dy_last, wheel_last = moves[-1]
                    moves[-1] = (buttons_last, dx_last + final_dx, dy_last + final_dy, wheel_last)
                    accumulated_dx += final_dx
                    accumulated_dy += final_dy

        return moves

    def thread_Action_HumanLike(self):#拟人化操作线程
        """主循环线程，持续处理操作"""
        while self.running:
            # 处理绝对目标位置
            if self.target_position != [0, 0]:
                self.current_position = list(self.get_mouse_position())  
                dx = self.target_position[0] - self.current_position[0]
                dy = self.target_position[1] - self.current_position[1]
                steps = max(30, int((abs(dx) + abs(dy)) / self.move_speed))
                moves = self.generate_moves(dx, dy, steps=steps)
                self.move_mouse_rel_batch(moves)
                self.target_position = [0, 0]
                
            # 处理相对移动
            if self.delta_position != [0, 0]:
                dx, dy = self.delta_position
                steps = max(1, int((abs(dx) + abs(dy)) / self.move_speed))
                moves = self.generate_moves(dx, dy, steps=steps)
                self.move_mouse_rel_batch(moves)
                self.current_position[0] += dx
                self.current_position[1] += dy
                self.delta_position = [0, 0]  # 重置相对移动

            # 处理鼠标按键
            if self.mouse_button != 0:
                self.move_mouse_rel(buttons=self.mouse_button, dx=0, dy=0, wheel=0)
                self.mouse_button = 0  # 重置按键
                time.sleep(random.triangular(*self.time_delay))# 添加按键随机延时
                self.move_mouse_rel(buttons=0x00, dx=0, dy=0, wheel=0)

            # 处理滚轮
            if self.wheel != 0:
                self.move_mouse_rel(buttons=0, dx=0, dy=0, wheel=self.wheel)
                self.wheel = 0  # 重置滚轮

            # 处理键盘按键
            if self.keyboard_button is not None:
                self.press_key(char_input=self.keyboard_button)
                self.keyboard_button = None  # 重置按键
                time.sleep(random.triangular(*self.time_delay))# 添加按键随机延时
                self.press_key(ctrl_keys=0x00, key_codes=[0x00]*6)
                
    
    ## 关闭串口
    def close(self):
        """关闭串口连接并停止线程"""
        self.running = False
        if self.ser.is_open:
            self.ser.close()
            
            
            




# 使用示例
if __name__ == "__main__":
    try:
        # 初始化控制器（根据实际COM口和波特率调整）
        controller = CH9329Controller(com_port='COM46', baudrate=9600)
        
        # time.sleep(1)
        
        # controller.keyboard_button = 'A'# 示例1：按下并释放字母A（无控制键）
        
        # time.sleep(1)
        
        controller.target_position = [1000, 500]  # 鼠标绝对移动
        
        time.sleep(1)
        # time.sleep(1)
        
        # controller.delta_position = [400, -100]  # 鼠标相对移动
        
        # time.sleep(1)
        
        # controller.delta_position = [-400, -100]  # 鼠标相对移动 
        
        # time.sleep(1)
        
        # controller.delta_position = [-400, 100]  # 鼠标相对移动 
        
        # time.sleep(1)
        
        # controller.delta_position = [400, 100]  # 鼠标相对移动 
        
        # time.sleep(1)
        
        # controller.mouse_button = 0x01  # 左键点击
        
        # time.sleep(1)
        
        # controller.wheel = 1
        
        # time.sleep(1)
        
        # controller.wheel = -5

        # time.sleep(2)
        
        controller.close()#关闭串口
    
    
    except serial.SerialException as e:
        logging.info("串口连接错误：", e)
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        