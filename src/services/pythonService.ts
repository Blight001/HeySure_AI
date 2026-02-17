/**
 * Python 脚本 API 服务
 * 统一封装 Python 脚本相关的操作
 */
import type { PythonFunctionInfo } from '@/types/flow';

// 导入文件系统服务
import { readFile, writeFile, pathJoin, ensureDir, pathBasename, getAppDataPath } from './fileSystem';

/**
 * 获取脚本模式文件夹路径
 */
export async function getModeFolderPath(): Promise<string> {
  const appData = await getAppDataPath();
  return pathJoin(appData, 'HeySure', 'data', 'script', 'mode');
}

/**
 * 获取主脚本路径
 */
export async function getMainPyPath(): Promise<string> {
  const appData = await getAppDataPath();
  return pathJoin(appData, 'HeySure', 'data', 'script', 'main.py');
}

/**
 * 复制脚本到模式文件夹
 */
export async function copyScriptToMode(
  sourcePath: string,
  _scriptId: string
): Promise<{ success: boolean; savedPath?: string; content?: string; error?: string }> {
  console.log('[PythonService] copyScriptToMode:', sourcePath);
  try {
    // 读取源文件内容
    const content = await readFile(sourcePath);
    const fileName = await pathBasename(sourcePath);

    // 构建目标路径 - 使用原文件名
    const modeFolder = await getModeFolderPath();
    console.log('[PythonService] Mode folder:', modeFolder);
    await ensureDir(modeFolder);
    const savedPath = await pathJoin(modeFolder, fileName);
    console.log('[PythonService] Target path:', savedPath);

    // 写入目标文件
    await writeFile(savedPath, content);
    console.log('[PythonService] File written successfully');

    return { success: true, savedPath, content };
  } catch (error) {
    console.error('[PythonService] Copy failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '复制脚本失败'
    };
  }
}

/**
 * 分析 Python 脚本内容
 */
export function analyzePythonContent(
  content: string,
  filePath: string
): {
  functions: PythonFunctionInfo[];
  classes: string[];
  overallDescription: string;
  contentSource: 'file' | 'fallback';
} {
  console.log('[PythonService] Analyzing content from:', filePath);
  const functions: PythonFunctionInfo[] = [];
  const classes: string[] = [];


  // 提取函数定义
  const funcRegex = /^(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?:\s*$/gm;
  let match;

  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[1];
    const paramsStr = match[2];

    // 提取函数文档字符串
    const funcStart = match.index;
    const afterFunc = content.substring(funcStart + match[0].length);
    const docMatch = afterFunc.match(/^\s*["']{3}([\s\S]*?)["']{3}/);

    // 提取函数体
    const nextFuncMatch = afterFunc.match(/^(?:async\s+)?def\s+|^(?:class\s+\w+)/m);
    const funcEnd = nextFuncMatch ? content.indexOf(nextFuncMatch[0], funcStart) : content.length;
    const funcBody = content.substring(funcStart, funcEnd);

    // 计算行号
    const linesBefore = content.substring(0, funcStart).split('\n').length;

    // 解析参数
    const params = paramsStr
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p)
      .map((p) => {
        const [name, defaultValue] = p.split('=').map((s) => s.trim());
        const hasDefault = !!defaultValue;
        return {
          name,
          type: inferType(defaultValue),
          defaultValue,
          description: `${name} 参数`,
          required: !hasDefault,
        };
      });

    functions.push({
      name: funcName,
      description: docMatch ? docMatch[1].trim() : `${funcName} 函数`,
      parameters: params,
      lineNumber: linesBefore,
      sourceCode: funcBody.trim(),
      returns: { type: 'any', description: '返回值' },
    });
  }

  // 提取类定义
  const classRegex = /^class\s+(\w+)(?:\([^)]*\))?:\s*$/gm;
  while ((match = classRegex.exec(content)) !== null) {
    classes.push(match[1]);
  }

  // 生成总体描述
  const funcDescriptions = functions.map((f) => `• ${f.name}()`).join('\n');
  const overallDescription = `Python 脚本 ${pathBasename(filePath)} 包含 ${functions.length} 个函数${
    classes.length > 0 ? `和 ${classes.length} 个类` : ''
  }:\n${funcDescriptions}`;

  return {
    functions,
    classes,
    overallDescription,
    contentSource: 'file',
  };
}

/**
 * 推断参数类型
 */
function inferType(defaultValue: string | undefined): string {
  if (!defaultValue) return 'any';
  if (['true', 'false'].includes(defaultValue)) return 'boolean';
  if (/^-?\d+$/.test(defaultValue)) return 'number';
  if (/^-?\d+\.\d+$/.test(defaultValue)) return 'number';
  if (/^["'].*["']$/.test(defaultValue)) return 'string';
  if (defaultValue === 'None') return 'any';
  return 'any';
}

/**
 * 获取模拟 Python 内容（用于开发环境）
 */
export function getMockPythonContent(): string {
  return `import time
import random
from typing import Dict, List, Any

def get_mouse_position() -> Dict[str, int]:
    """获取当前鼠标位置
    Returns:
        {'x': int, 'y': int}
    """
    pass

def move_mouse_to(x: int, y: int, duration: float = 0.1) -> bool:
    """将鼠标移动到指定位置
    Args:
        x: 目标X坐标
        y: 目标Y坐标
        duration: 移动持续时间（秒）
    Returns:
        是否成功
    """
    pass

def click_mouse(button: str = 'left', times: int = 1) -> bool:
    """点击鼠标
    Args:
        button: 按钮类型 ('left', 'right', 'middle')
        times: 点击次数
    Returns:
        是否成功
    """
    pass

def scroll_mouse(direction: str, amount: int = 1) -> bool:
    """滚动鼠标滚轮
    Args:
        direction: 滚动方向 ('up', 'down')
        amount: 滚动量
    Returns:
        是否成功
    """
    pass

def press_key(key: str) -> bool:
    """按下键盘按键
    Args:
        key: 按键名称
    Returns:
        是否成功
    """
    pass

def type_text(text: str, interval: float = 0.05) -> bool:
    """输入文本
    Args:
        text: 要输入的文本
        interval: 每个字符间隔时间（秒）
    Returns:
        是否成功
    """
    pass`;
}

/**
 * 检查是否是开发环境
 */
export function isDevEnvironment(): boolean {
  return !window.electronAPI?.fs;
}

