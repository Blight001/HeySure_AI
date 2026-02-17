/**
 * HeySure AI - 窗口控制 IPC 处理器
 * 处理与窗口操作相关的 IPC 通信：
 * - window:minimize: 最小化窗口
 * - window:maximize: 最大化/还原窗口
 * - window:close: 关闭窗口
 * - window:isMaximized: 获取窗口最大化状态
 * - window:openDevTools: 打开开发者工具
 * - window:closeDevTools: 关闭开发者工具
 * - window:toggleDevTools: 切换开发者工具
 * 
 * 监听窗口状态变化事件并通知渲染进程
 */
import { ipcMain, BrowserWindow } from 'electron';
import { WindowManager } from '../window/windowManager';

// 设置窗口事件监听
function setupWindowListeners(win: BrowserWindow) {
  win.on('maximize', () => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('window:maximizeState', true);
    });
  });

  win.on('unmaximize', () => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('window:maximizeState', false);
    });
  });

  win.on('minimize', () => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('window:minimizeState', true);
    });
  });

  win.on('restore', () => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('window:minimizeState', false);
    });
  });
}

export function windowIPC() {
  // 最小化窗口
  ipcMain.handle('window:minimize', () => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  // 最大化/还原窗口
  ipcMain.handle('window:maximize', () => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  // 关闭窗口
  ipcMain.handle('window:close', () => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.close();
    }
  });

  // 获取窗口是否最大化
  ipcMain.handle('window:isMaximized', () => {
    const mainWindow = WindowManager.getMainWindow();
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // 打开开发者工具
  ipcMain.handle('window:openDevTools', () => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // 关闭开发者工具
  ipcMain.handle('window:closeDevTools', () => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.closeDevTools();
    }
  });

  // 切换开发者工具
  ipcMain.handle('window:toggleDevTools', () => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }
  });

  // 为已存在的窗口设置监听器
  BrowserWindow.getAllWindows().forEach((win) => {
    setupWindowListeners(win);
  });
}
