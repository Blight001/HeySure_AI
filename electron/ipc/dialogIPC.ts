/**
 * HeySure AI - 对话 IPC 处理器
 * 处理与对话相关的 IPC 通信：
 * - dialog:showPrompt: 显示输入对话框
 * - dialog:openFile: 打开文件对话框
 * - dialog:create: 创建新对话
 * - dialog:list: 获取对话列表
 * - dialog:get: 获取单个对话详情
 * - dialog:update: 更新对话信息
 * - dialog:delete: 删除对话
 * - dialog:batchDelete: 批量删除对话
 * - dialog:batchUpdate: 批量更新对话
 */
import { ipcMain, app, dialog, BrowserWindow, webContents } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, promises as fs } from 'fs';
import { Dialog, DialogMessage, DialogStorage, DATA_DIR, DIALOGS_FILE, MESSAGES_FILE, ensureDataDir } from '../config/paths';
import { dialogStore } from '../services/dialogStore';

// 广播对话变更事件
const broadcastDialogChange = () => {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('dialog:changed');
  });
};

import { join } from 'path';

export function dialogIPC() {
  // 显示输入对话框
  ipcMain.handle('dialog:showPrompt', async (_, data: { title?: string; label?: string; defaultValue?: string }) => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (!focusedWindow) {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length === 0) {
          return { success: false, error: 'No window available' };
        }
      }

      const window = focusedWindow || BrowserWindow.getAllWindows()[0];
      const webContents = window.webContents;

      const promptScript = `
        (function() {
          try {
            var result = prompt(${JSON.stringify(data.label || '请输入节点名称:')}, ${JSON.stringify(data.defaultValue || '')});
            if (result === null) {
              return { canceled: true };
            }
            return { value: result };
          } catch (e) {
            return { error: e.message };
          }
        })()
      `;

      const result = await webContents.executeJavaScript(promptScript);

      if (result.error) {
        return { success: false, error: result.error };
      }

      if (result.canceled) {
        return { success: true, data: null };
      }

      return { success: true, data: result.value };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 打开文件对话框
  ipcMain.handle('dialog:openFile', async (_, options: any) => {
    try {
      const { dialog } = require('electron');
      const window = BrowserWindow.getFocusedWindow();
      const result = await dialog.showOpenDialog(window, options || {});
      return result;
    } catch (error: any) {
      console.error('Open file dialog failed:', error);
      return { canceled: true, error: error.message };
    }
  });

  // 创建对话
  ipcMain.handle('dialog:create', async (_, data: { title?: string; type: Dialog['type']; flowId?: string }) => {
    try {
      const now = Date.now();
      const newDialog: DialogStorage = {
        id: uuidv4(),
        title: data.title || '新对话',
        type: data.type || 'single',
        flowId: data.flowId,
        createdAt: now,
        updatedAt: now,
        isPinned: false,
        messages: []
      };
      dialogStore.set(newDialog.id, newDialog);
      await dialogStore.saveAllDialogs();
      broadcastDialogChange();
      return { success: true, data: newDialog };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 获取对话列表
  ipcMain.handle('dialog:list', async (_, data?: { search?: string; limit?: number; offset?: number }) => {
    try {
      let list = dialogStore.getAll();
      if (data?.search) {
        const search = data.search.toLowerCase();
        list = list.filter((d) => d.title.toLowerCase().includes(search));
      }
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
      if (data?.offset) {
        list = list.slice(data.offset);
      }
      if (data?.limit) {
        list = list.slice(0, data.limit);
      }
      return { success: true, data: list };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 获取单个对话
  ipcMain.handle('dialog:get', async (_, { id }: { id: string }) => {
    try {
      const dialog = dialogStore.get(id);
      return { success: true, data: dialog || null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 更新对话
  ipcMain.handle('dialog:update', async (_, data: { id: string; updates: Partial<Dialog> }) => {
    try {
      const dialog = dialogStore.get(data.id);

      if (!dialog) {
        return { success: false, error: '对话不存在' };
      }

      // 更新对话元数据（标题等）
      const updated = { ...dialog, ...data.updates, updatedAt: Date.now() };
      dialogStore.set(data.id, updated);
      await dialogStore.saveAllDialogs();
      broadcastDialogChange();
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 删除对话
  ipcMain.handle('dialog:delete', async (_, { id }: { id: string }) => {
    try {
      await dialogStore.deleteDialog(id);
      broadcastDialogChange();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 批量删除对话
  ipcMain.handle('dialog:batchDelete', async (_, { ids }: { ids: string[] }) => {
    try {
      await dialogStore.batchDelete(ids);
      broadcastDialogChange();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 批量更新对话
  ipcMain.handle('dialog:batchUpdate', async (_, data: { ids: string[]; updates: Partial<Dialog> }) => {
    try {
      const { ids, updates } = data;
      let changed = false;
      const now = Date.now();

      for (const id of ids) {
        const dialog = dialogStore.get(id);
        if (dialog) {
          const updated = { ...dialog, ...updates, updatedAt: now };
          dialogStore.set(id, updated);
          changed = true;
        }
      }

      if (changed) {
        await dialogStore.saveAllDialogs();
        broadcastDialogChange();
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
