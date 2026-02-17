import { ipcMain, BrowserWindow, dialog } from 'electron';

/**
 * 文件对话框IPC处理器
 * 处理文件选择、保存等对话框操作
 */
export function fileDialogIPC() {
  // 打开文件对话框
  ipcMain.handle('dialog:showOpenDialog', async (_, options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: string[];
  }) => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      const result = await dialog.showOpenDialog(win || undefined, {
        title: options?.title || '选择文件',
        defaultPath: options?.defaultPath,
        filters: options?.filters,
        properties: options?.properties || ['openFile'],
      });

      return {
        success: true,
        canceled: result.canceled,
        filePaths: result.filePaths,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '打开文件对话框失败',
        canceled: true,
        filePaths: [],
      };
    }
  });

  // 保存文件对话框
  ipcMain.handle('dialog:showSaveDialog', async (_, options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      const result = await dialog.showSaveDialog(win || undefined, {
        title: options?.title || '保存文件',
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });

      return {
        success: true,
        canceled: result.canceled,
        filePath: result.filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存文件对话框失败',
        canceled: true,
        filePath: undefined,
      };
    }
  });

  // 消息框对话框
  ipcMain.handle('dialog:showMessageBox', async (_, options: {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning';
    title?: string;
    message: string;
    detail?: string;
    buttons?: string[];
    defaultId?: number;
    cancelId?: number;
  }) => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      const result = await dialog.showMessageBox(win || undefined, {
        type: options?.type || 'info',
        title: options?.title || '提示',
        message: options?.message,
        detail: options?.detail,
        buttons: options?.buttons,
        defaultId: options?.defaultId,
        cancelId: options?.cancelId,
      });

      return {
        success: true,
        response: result.response,
        checkboxChecked: result.checkboxChecked,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '显示消息框失败',
        response: -1,
        checkboxChecked: false,
      };
    }
  });

  // 选择文件夹对话框
  ipcMain.handle('dialog:selectDirectory', async (_, options?: {
    title?: string;
    defaultPath?: string;
  }) => {
    try {
      const win = BrowserWindow.getFocusedWindow();
      const result = await dialog.showOpenDialog(win || undefined, {
        title: options?.title || '选择文件夹',
        defaultPath: options?.defaultPath,
        properties: ['openDirectory', 'createDirectory'],
      });

      return {
        success: true,
        canceled: result.canceled,
        filePaths: result.filePaths,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '选择文件夹失败',
        canceled: true,
        filePaths: [],
      };
    }
  });

  console.log('File dialog IPC handlers set up successfully.');
}

