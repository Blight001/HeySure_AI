/**
 * HeySure AI - 文件系统和路径 IPC 处理器
 * 
 * 文件系统相关 IPC（fsIPC）：
 * - fs:readFile: 读取文件内容
 * - fs:writeFile: 写入文件内容
 * - fs:readdir: 读取目录内容
 * - fs:mkdirSync: 创建目录
 * - fs:unlink: 删除文件
 * - fs:existsSync: 检查文件是否存在
 * 
 * Python 脚本路径相关：
 * - python:getScriptDir: 获取 Python 脚本目录
 * - python:getModeDir: 获取 Python 模式目录
 * - python:getMainPyPath: 获取 Python 主脚本路径
 * 
 * 路径操作相关（pathIPC）：
 * - path:join: 路径拼接
 * - path:basename: 获取文件名
 * - path:dirname: 获取目录名
 * - path:extname: 获取文件扩展名
 * - path:resolve: 解析绝对路径
 * - path:getAppData: 获取 AppData 路径
 * - path:getUserData: 获取用户数据路径
 */
import { ipcMain, app } from 'electron';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, basename, dirname, extname, resolve } from 'path';
import {
  PYTHON_SCRIPT_DIR,
  PYTHON_MODE_DIR,
  PYTHON_MAIN_FILE,
} from '../config/paths';

/**
 * 辅助函数：安全地将错误转换为可序列化的对象
 * 确保错误信息可以通过 IPC 传递
 */
function serializeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack
    };
  }
  return { message: String(error) };
}

/**
 * 设置文件系统 IPC 处理器
 */
export function fsIPC() {
  // 读取文件
  ipcMain.handle('fs:readFile', async (_, path: string, encoding?: string) => {
    try {
      console.log('[fsIPC] 读取文件请求:', { path, encoding });
      const content = encoding
        ? readFileSync(path, encoding as BufferEncoding)
        : readFileSync(path, 'utf-8');
      console.log('[fsIPC] 读取成功, 长度:', content.length);
      return content;
    } catch (error) {
      console.error('[fsIPC] 读取文件失败:', path, error);
      const serialized = serializeError(error);
      throw new Error(`读取文件失败: ${serialized.message}`);
    }
  });

  // 写入文件
  ipcMain.handle('fs:writeFile', async (_, path: string, data: string, encoding?: string) => {
    try {
      console.log('[fsIPC] 写入文件请求:', { path, encoding: encoding || 'utf-8', dataLength: data.length });
      const encodingOption = encoding || 'utf-8';
      writeFileSync(path, data, encodingOption as BufferEncoding);
      console.log('[fsIPC] 写入成功:', path);
    } catch (error) {
      console.error('[fsIPC] 写入文件失败:', path, error);
      const serialized = serializeError(error);
      throw new Error(`写入文件失败: ${serialized.message}`);
    }
  });

  // 读取目录
  ipcMain.handle('fs:readdir', async (_, path: string) => {
    try {
      console.log('[fsIPC] 读取目录请求:', path);
      const files = readdirSync(path);
      console.log('[fsIPC] 读取目录成功, 文件数:', files.length);
      return files;
    } catch (error) {
      console.error('[fsIPC] 读取目录失败:', path, error);
      const serialized = serializeError(error);
      throw new Error(`读取目录失败: ${serialized.message}`);
    }
  });

  // 创建目录
  ipcMain.handle('fs:mkdirSync', async (_, path: string, options?: { recursive?: boolean }) => {
    try {
      console.log('[fsIPC] 创建目录:', path);
      mkdirSync(path, options);
      console.log('[fsIPC] 创建目录成功');
    } catch (error) {
      console.error('[fsIPC] 创建目录失败:', path, error);
      // 目录可能已存在，不抛出错误
    }
  });

  // 删除文件
  ipcMain.handle('fs:unlink', async (_, path: string) => {
    try {
      console.log('[fsIPC] 删除文件:', path);
      unlinkSync(path);
      console.log('[fsIPC] 删除文件成功');
    } catch (error) {
      console.error('[fsIPC] 删除文件失败:', path, error);
      const serialized = serializeError(error);
      throw new Error(`删除文件失败: ${serialized.message}`);
    }
  });

  // 检查文件是否存在
  ipcMain.handle('fs:existsSync', async (_, path: string) => {
    try {
      return existsSync(path);
    } catch (error) {
      console.error('[fsIPC] 检查文件存在失败:', path, error);
      return false;
    }
  });

  // ========== Python 脚本路径获取 ==========

  // 获取 Python 脚本目录
  ipcMain.handle('python:getScriptDir', () => {
    return PYTHON_SCRIPT_DIR;
  });

  // 获取 Python 模式目录
  ipcMain.handle('python:getModeDir', () => {
    return PYTHON_MODE_DIR;
  });

  // 获取 Python 主脚本路径
  ipcMain.handle('python:getMainPyPath', () => {
    return PYTHON_MAIN_FILE;
  });
}

/**
 * path 处理器
 */
export function pathIPC() {
  ipcMain.handle('path:join', (_, ...paths: string[]) => {
    return join(...paths);
  });

  ipcMain.handle('path:basename', (_, path: string, ext?: string) => {
    return basename(path, ext);
  });

  ipcMain.handle('path:dirname', (_, path: string) => {
    return dirname(path);
  });

  ipcMain.handle('path:extname', (_, path: string) => {
    return extname(path);
  });

  ipcMain.handle('path:resolve', (_, ...paths: string[]) => {
    return resolve(...paths);
  });

  ipcMain.handle('path:getAppData', () => {
    return process.env.APPDATA || join(process.env.HOME || '', '.config');
  });

  ipcMain.handle('path:getUserData', () => {
    return app.getPath('userData');
  });
}
