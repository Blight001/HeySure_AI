/**
 * HeySure AI - Electron 主进程入口
 * 负责 Electron 应用的生命周期管理、全局快捷键注册、
 * 窗口创建、IPC 处理器初始化和模型系统初始化
 */
import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import { join } from 'path';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import { WindowManager } from './window/windowManager';
import { setupIPCHandlers } from './ipc';
import { initModels } from './ipc/pluginIPC';

app.whenReady().then(async () => {
  console.log('[Main] App Starting...');
  console.log('[Main] Environment:', is.dev ? 'Development' : 'Production');
  console.log('[Main] User Data Path:', app.getPath('userData'));
  console.log('[Main] App Path:', app.getAppPath());
  
  // 设置应用程序名称
  electronApp.setAppUserModelId('com.heysure.ai');

  // 注册全局快捷键
  globalShortcut.register('CommandOrControl+Shift+K', () => {
    WindowManager.showMainWindow();
  });

  // 开发环境启用调试
  if (is.dev) {
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });
  }

  // 创建主窗口
  WindowManager.createMainWindow();

  // 设置 IPC 处理器（在窗口创建后）
  setupIPCHandlers();

  // 初始化模型系统（加载保存的模型配置）
  await initModels();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      WindowManager.createMainWindow();
    }
  });
});

// 关闭窗口时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// 拒绝未处理的承诺
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

