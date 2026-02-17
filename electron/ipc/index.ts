/**
 * HeySure AI - Electron IPC 处理器注册入口
 * 负责注册所有 IPC 通信处理器：
 * - dialogIPC: 对话管理
 * - messageIPC: 消息管理
 * - pluginIPC: 插件/模型管理
 * - aiIPC: AI 交互
 * - flowIPC: 流程管理
 * - nodeIPC: 节点管理
 * - storeIPC: 存储管理
 * - windowIPC: 窗口控制
 * - pythonIPC: Python 执行
 * - fileDialogIPC: 文件对话框
 * - fsIPC/pathIPC: 文件系统操作
 */
import { ipcMain } from 'electron';
import { dialogIPC } from './dialogIPC';
import { messageIPC } from './messageIPC';
import { pluginIPC } from './pluginIPC';
import { flowIPC } from './flowIPC';
import { storeIPC } from './storeIPC';
import { windowIPC } from './windowIPC';
import { pythonIPC } from './pythonIPC';
import { fileDialogIPC } from './fileDialogIPC';
import { fsIPC, pathIPC } from './fsIPC';
import { nodeIPC } from './nodeIPC';
import { aiIPC } from './aiIPC';

export function setupIPCHandlers() {
  console.log('Setting up IPC handlers...');

  // 对话相关
  dialogIPC();

  // 消息相关
  messageIPC();

  // 插件相关
  pluginIPC();
  
  // AI 相关
  aiIPC();
  
  // 流程相关
  flowIPC();

  // 节点相关
  nodeIPC();

  // 存储相关
  storeIPC();

  // 窗口控制相关
  windowIPC();

  // Python 执行相关
  pythonIPC();

  // 文件对话框相关
  fileDialogIPC();

  // 文件系统相关
  fsIPC();
  pathIPC();

  console.log('All IPC handlers set up successfully.');
}

