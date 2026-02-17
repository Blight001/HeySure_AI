import { promises as fs, existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  DialogStorage, 
  Dialog, 
  DialogMessage, 
  MESSAGES_FILE, 
  DIALOGS_FILE, 
  DATA_DIR, 
  ensureDataDir 
} from '../config/paths';

class DialogStore {
  private dialogs: Map<string, DialogStorage> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.initialized) return;
    await this.loadAllDialogs();
    this.initialized = true;
  }

  // 从文件加载所有对话数据
  public async loadAllDialogs(): Promise<void> {
    await ensureDataDir();
    this.dialogs.clear();

    // 优先从 messages.json 加载
    if (existsSync(MESSAGES_FILE)) {
      try {
        const content = await fs.readFile(MESSAGES_FILE, 'utf-8');
        const data: Record<string, DialogStorage> = JSON.parse(content);
        Object.entries(data).forEach(([id, dialog]) => {
          this.dialogs.set(id, dialog);
        });
        console.log(`[DialogStore] Loaded ${this.dialogs.size} dialogs from messages.json`);
      } catch (error) {
        console.error('[DialogStore] Failed to load messages.json:', error);
      }
    }

    // 兼容旧格式 migration logic from dialogIPC.ts
    if (existsSync(DIALOGS_FILE)) {
      try {
        const content = await fs.readFile(DIALOGS_FILE, 'utf-8');
        const oldData: Record<string, Dialog> = JSON.parse(content);
        let changed = false;

        for (const [id, oldDialog] of Object.entries(oldData)) {
          if (!this.dialogs.has(id)) {
            this.dialogs.set(id, {
              ...oldDialog,
              messages: []
            } as DialogStorage);
            changed = true;
          }
        }

        // Merge old messages if needed
        for (const [id, dialog] of this.dialogs.entries()) {
          if (dialog.messages.length === 0) {
            const oldMessagesFile = join(DATA_DIR, 'messages', `${id}.json`);
            if (existsSync(oldMessagesFile)) {
              try {
                const msgContent = await fs.readFile(oldMessagesFile, 'utf-8');
                const messages: DialogMessage[] = JSON.parse(msgContent);
                dialog.messages = messages;
                changed = true;
              } catch (e) {
                console.warn(`[DialogStore] Failed to load old message file: ${id}`);
              }
            }
          }
        }

        if (changed) {
          await this.saveAllDialogs();
          console.log(`[DialogStore] Migration completed, ${this.dialogs.size} dialogs`);
        }
      } catch (error) {
        console.error('[DialogStore] Migration failed:', error);
      }
    }
  }

  // 保存所有对话数据
  public async saveAllDialogs(): Promise<void> {
    await ensureDataDir();
    const data: Record<string, DialogStorage> = {};
    this.dialogs.forEach((dialog, id) => {
      data[id] = dialog;
    });
    
    // Write to temp file first for atomicity
    const tempFile = `${MESSAGES_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempFile, MESSAGES_FILE);
  }

  // 批量删除对话（包括清理旧文件）
  public async batchDelete(ids: string[]): Promise<boolean> {
    await ensureDataDir();
    let changed = false;
    const idsSet = new Set(ids);

    // 1. 从内存和主存储中删除
    for (const id of ids) {
      if (this.dialogs.has(id)) {
        this.dialogs.delete(id);
        changed = true;
      }

      // 2. 尝试清理可能存在的旧消息文件
      try {
        const oldMessagesFile = join(DATA_DIR, 'messages', `${id}.json`);
        if (existsSync(oldMessagesFile)) {
          await fs.unlink(oldMessagesFile);
          console.log(`[DialogStore] Deleted legacy message file: ${oldMessagesFile}`);
        }
      } catch (error) {
        console.warn(`[DialogStore] Failed to delete legacy file for ${id}:`, error);
      }
    }

    // 3. 清理 dialogs.json 中的残留记录，防止重启后“复活”
    if (existsSync(DIALOGS_FILE)) {
      try {
        const content = await fs.readFile(DIALOGS_FILE, 'utf-8');
        const oldData: Record<string, Dialog> = JSON.parse(content);
        let oldDataChanged = false;

        for (const id of ids) {
          if (oldData[id]) {
            delete oldData[id];
            oldDataChanged = true;
          }
        }

        if (oldDataChanged) {
          await fs.writeFile(DIALOGS_FILE, JSON.stringify(oldData, null, 2), 'utf-8');
          console.log('[DialogStore] Removed deleted dialogs from legacy dialogs.json');
        }
      } catch (error) {
        console.error('[DialogStore] Failed to clean up dialogs.json:', error);
      }
    }

    if (changed) {
      await this.saveAllDialogs();
    }
    return changed;
  }

  // 删除单个对话
  public async deleteDialog(id: string): Promise<boolean> {
    return this.batchDelete([id]);
  }

  // Public API to access dialogs
  public getAll(): DialogStorage[] {
    return Array.from(this.dialogs.values());
  }

  public get(id: string): DialogStorage | undefined {
    return this.dialogs.get(id);
  }

  public set(id: string, dialog: DialogStorage): void {
    this.dialogs.set(id, dialog);
  }

  public delete(id: string): boolean {
    return this.dialogs.delete(id);
  }

  public has(id: string): boolean {
    return this.dialogs.has(id);
  }
}

export const dialogStore = new DialogStore();
