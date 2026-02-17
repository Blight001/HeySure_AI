/**
 * HeySure AI - 存储 IPC 处理器
 * 处理与数据存储相关的 IPC 通信：
 * 
 * 思维导图相关：
 * - mindmap:getData: 获取思维导图数据（分类、地图）
 * - mindmap:saveData: 保存整个思维导图数据
 * - mindmap:save: 保存单个思维导图
 * - mindmap:get: 获取单个思维导图
 * - mindmap:list: 获取所有思维导图列表
 * - mindmap:delete: 删除思维导图
 * - mindmap:addCategory: 添加分类
 * - mindmap:deleteCategory: 删除分类
 * - mindmap:selectCategory: 选择当前分类
 * 
 * 设置相关：
 * - settings:get: 获取设置项
 * - settings:set: 保存设置项
 * - settings:reset: 重置设置
 * - settings:export: 导出设置数据
 * - settings:import: 导入设置数据
 * 
 * 支持数据缓存、磁盘同步、格式迁移等功能
 */
import { ipcMain } from 'electron';
import { existsSync, writeFileSync, readFileSync, unlinkSync, promises as fs } from 'fs';
import { join } from 'path';
import {
  SettingsType,
  MindmapData,
  MindmapCategory,
  CategoryStorageData,
  MINDMAPS_FILE,
  SETTINGS_FILE,
  getMindmapNodeFile,
  MINDMAP_DIR,
  DATA_DIR,
} from '../config/paths';

// 思维导图数据缓存
let mindmapDataCache: CategoryStorageData = {
  categories: [],
  selectedCategoryId: null,
  maps: {}
};

const MINDMAP_STORAGE_KEY = 'hey_sure_mindmap_data';

// 确保目录存在
async function ensureMindmapDir(): Promise<void> {
  if (!existsSync(MINDMAP_DIR)) {
    await fs.mkdir(MINDMAP_DIR, { recursive: true });
  }
}

/**
 * 同步磁盘上的思维导图文件到缓存
 * 修复 mindmaps.json 与实际文件不一致的问题
 */
async function syncMindmapDataWithDisk(data: CategoryStorageData): Promise<void> {
  try {
    const files = await fs.readdir(MINDMAP_DIR);
    const mapFiles = files.filter(f => f.startsWith('map_') && f.endsWith('.json'));
    let hasChanges = false;

    // 1. 扫描磁盘文件，添加到缓存
    for (const file of mapFiles) {
      // 文件名格式: map_{id}.json
      // 例如: map_node_123.json -> id = node_123
      const mapId = file.replace(/^map_/, '').replace(/\.json$/, '');
      
      // 如果缓存中没有该导图，尝试加载
      if (!data.maps[mapId]) {
        try {
          const filePath = join(MINDMAP_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          
          // 检查文件是否损坏（全空或包含大量 null 字节）
          if (!content || content.trim().length === 0 || content.includes('\0')) {
            console.warn(`[Mindmap] Skipping corrupted map file: ${file}`);
            continue;
          }

          const mapData = JSON.parse(content);
          if (mapData && mapData.id === mapId) {
            console.log(`[Mindmap] Recovering missing map: ${mapId}`);
            data.maps[mapId] = mapData;
            hasChanges = true;
            
            // 检查是否在任何分类中
            let inCategory = false;
            for (const cat of data.categories) {
              if (cat.mapIds.includes(mapId)) {
                inCategory = true;
                break;
              }
            }
            
            // 如果不在任何分类中，添加到当前选中分类或第一个分类
            if (!inCategory) {
              const targetCatId = data.selectedCategoryId || (data.categories.length > 0 ? data.categories[0].id : null);
              if (targetCatId) {
                const category = data.categories.find(c => c.id === targetCatId);
                if (category) {
                  category.mapIds.push(mapId);
                  hasChanges = true;
                }
              }
            }
          }
        } catch (err) {
          console.error(`[Mindmap] Failed to load map from disk: ${file}`, err);
        }
      }
    }

    // 2. 检查缓存中的导图是否在磁盘上存在
    // (可选：如果想自动清理不存在的引用，可以在这里做，但为了安全起见暂时保留引用)
    
    if (hasChanges) {
      console.log('[Mindmap] Sync completed, saving changes to index.');
      await fs.writeFile(MINDMAPS_FILE, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('[Mindmap] Sync with disk failed:', error);
  }
}

// 初始化思维导图数据
async function initMindmapData(): Promise<CategoryStorageData> {
  // 确保目录存在
  await ensureMindmapDir();

  const dataPath = MINDMAPS_FILE;
  try {
    if (existsSync(dataPath)) {
      const content = readFileSync(dataPath, 'utf-8');
      const data = JSON.parse(content);
      // 同步磁盘文件，修复可能的索引丢失
      await syncMindmapDataWithDisk(data);
      return data;
    }
  } catch (error) {
    console.error('Failed to load mindmap data:', error);
  }

  // 尝试从旧路径迁移
  const oldDataPath = `${DATA_DIR}/mindmaps.json`;
  const oldNodePrefix = `${DATA_DIR}/mindmap_`;
  try {
    if (existsSync(oldDataPath)) {
      const content = readFileSync(oldDataPath, 'utf-8');
      const data = JSON.parse(content);
      // 确保目录存在并保存到新位置
      await fs.mkdir(MINDMAP_DIR, { recursive: true });
      writeFileSync(dataPath, content);
      console.log('Migrated mindmap data from old path');
      return data;
    }
  } catch (error) {
    console.error('Failed to migrate mindmap data:', error);
  }

  // 返回默认数据
  const defaultData: CategoryStorageData = {
    categories: [{
      id: 'default',
      name: '默认分类',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mapIds: []
    }],
    selectedCategoryId: 'default',
    maps: {}
  };
  
  // 即使是新建的默认配置，也要尝试扫描现有文件，以防 mindmaps.json 丢失但 map 文件还在的情况
  await syncMindmapDataWithDisk(defaultData);
  
  return defaultData;
}

// 保存思维导图数据
async function saveMindmapData(): Promise<boolean> {
  await ensureMindmapDir();
  const dataPath = MINDMAPS_FILE;
  try {
    writeFileSync(dataPath, JSON.stringify(mindmapDataCache, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save mindmap data:', error);
    return false;
  }
}

// 读取单个思维导图
async function readMindmap(mapId: string): Promise<MindmapData | null> {
  // 先尝试新路径 (map_xxx.json)
  const newPath = `${MINDMAP_DIR}/map_${mapId}.json`;
  try {
    if (existsSync(newPath)) {
      const content = readFileSync(newPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to read mindmap:', error);
  }

  // 再尝试旧路径 (mindmap_xxx.json)
  const oldPath = `${MINDMAP_DIR}/mindmap_${mapId}.json`;
  try {
    if (existsSync(oldPath)) {
      const content = readFileSync(oldPath, 'utf-8');
      const data = JSON.parse(content);
      // 迁移到新路径
      const newPath = getMindmapNodeFile(mapId);
      writeFileSync(newPath, JSON.stringify(data, null, 2));
      // 删除旧文件
      fs.unlink(oldPath).catch(() => {});
      return data;
    }
  } catch (error) {
    console.error('Failed to read mindmap:', error);
  }

  return null;
}

// 保存单个思维导图
async function saveMindmap(mapData: MindmapData): Promise<boolean> {
  await ensureMindmapDir();
  const mapPath = getMindmapNodeFile(mapData.id);
  try {
    writeFileSync(mapPath, JSON.stringify(mapData, null, 2));
    // 删除可能存在的旧格式文件
    const oldPath = `${MINDMAP_DIR}/mindmap_${mapData.id}.json`;
    if (existsSync(oldPath)) {
      fs.unlink(oldPath).catch(() => {});
    }
    return true;
  } catch (error) {
    console.error('Failed to save mindmap:', error);
    return false;
  }
}

// 删除思维导图文件
function deleteMindmapFile(mapId: string): boolean {
  // 删除新格式文件
  const newPath = getMindmapNodeFile(mapId);
  // 删除旧格式文件
  const oldPath = `${MINDMAP_DIR}/mindmap_${mapId}.json`;

  try {
    if (existsSync(newPath)) {
      unlinkSync(newPath);
    }
    if (existsSync(oldPath)) {
      unlinkSync(oldPath);
    }
    return true;
  } catch (error) {
    console.error('Failed to delete mindmap file:', error);
    return false;
  }
}

// 异步初始化
let mindmapDataInitialized = false;
async function initializeMindmapData(): Promise<void> {
  if (mindmapDataInitialized) return;
  mindmapDataCache = await initMindmapData();
  mindmapDataInitialized = true;
}

// 立即启动初始化
initializeMindmapData();

// 默认设置（合并配置中的类型和默认值）
const defaultSettings: SettingsType = {
  theme: 'system',
  language: 'zh-CN',
  fontSize: 14,
  autoSave: true,
  autoSaveInterval: 30,
  showConsole: true,
  maxHistoryCount: 100,
  enableSpellCheck: false,
  enableMarkdownPreview: true,
  enableCodeHighlight: true,
  enableSound: true,
  notificationOnComplete: true,
  defaultModel: '',
  temperature: 0.7,
  maxTokens: 4096,
  shortcuts: {
    newDialog: 'Ctrl+N',
    search: 'Ctrl+K',
    settings: 'Ctrl+,',
    toggleSidebar: 'Ctrl+B',
  },
};

// 读取设置
function readSettings(): Record<string, any> {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const content = readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to read settings:', error);
  }
  return { ...defaultSettings };
}

// 保存设置
function saveSettings(settings: Record<string, any>): boolean {
  try {
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

// 当前设置缓存
let settingsCache = readSettings();

export function storeIPC() {
  // ==================== 思维导图相关 ====================
  
  // 获取思维导图数据
  ipcMain.handle('mindmap:getData', () => {
    return mindmapDataCache;
  });

  // 保存整个思维导图数据
  ipcMain.handle('mindmap:saveData', async (_, data: CategoryStorageData) => {
    mindmapDataCache = data;
    return await saveMindmapData();
  });

  // 保存单个思维导图
  ipcMain.handle('mindmap:save', async (_, mapData: MindmapData) => {
    mindmapDataCache.maps[mapData.id] = mapData;
    const success = await saveMindmap(mapData);
    if (success) {
      await saveMindmapData();
    }
    return success;
  });

  // 获取单个思维导图
  ipcMain.handle('mindmap:get', async (_, mapId: string) => {
    // 先检查缓存
    if (mindmapDataCache.maps[mapId]) {
      return mindmapDataCache.maps[mapId];
    }
    // 如果缓存没有，尝试从文件读取
    return await readMindmap(mapId);
  });

  // 获取所有思维导图列表
  ipcMain.handle('mindmap:list', () => {
    return Object.values(mindmapDataCache.maps);
  });

  // 删除思维导图
  ipcMain.handle('mindmap:delete', async (_, mapId: string) => {
    delete mindmapDataCache.maps[mapId];
    // 从所有分类中移除
    for (const category of mindmapDataCache.categories) {
      category.mapIds = category.mapIds.filter(id => id !== mapId);
    }
    deleteMindmapFile(mapId);
    await saveMindmapData();
    return true;
  });

  // 添加分类
  ipcMain.handle('mindmap:addCategory', async (_, name: string) => {
    const newCategory: MindmapCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mapIds: []
    };
    mindmapDataCache.categories.push(newCategory);
    await saveMindmapData();
    return newCategory;
  });

  // 删除分类
  ipcMain.handle('mindmap:deleteCategory', async (_, categoryId: string) => {
    const index = mindmapDataCache.categories.findIndex(c => c.id === categoryId);
    if (index !== -1) {
      mindmapDataCache.categories.splice(index, 1);
      // 删除该分类下的所有思维导图文件
      const category = mindmapDataCache.categories[index];
      if (category) {
        for (const mapId of category.mapIds) {
          deleteMindmapFile(mapId);
          delete mindmapDataCache.maps[mapId];
        }
      }
      await saveMindmapData();
      return true;
    }
    return false;
  });

  // 选择分类
  ipcMain.handle('mindmap:selectCategory', async (_, categoryId: string) => {
    mindmapDataCache.selectedCategoryId = categoryId;
    await saveMindmapData();
    return true;
  });

  // ==================== 设置相关 ====================
  ipcMain.handle('settings:get', (_, { key }: { key?: string }) => {
    if (key) {
      return settingsCache[key];
    }
    return settingsCache;
  });

  // 保存设置
  ipcMain.handle('settings:set', (_, data: { key: string; value: any }) => {
    settingsCache[data.key] = data.value;
    return saveSettings(settingsCache);
  });

  // 重置设置
  ipcMain.handle('settings:reset', (_, { keys }: { keys?: string[] }) => {
    if (keys) {
      keys.forEach((key) => {
        if (key in defaultSettings) {
          (settingsCache as Record<string, unknown>)[key] = (defaultSettings as unknown as Record<string, unknown>)[key];
        }
      });
    } else {
      settingsCache = { ...defaultSettings };
    }
    return saveSettings(settingsCache);
  });

  // 导出数据
  ipcMain.handle('settings:export', (_, data: { format: 'json' | 'zip'; includeHistory: boolean }) => {
    const exportData = {
      settings: settingsCache,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    return {
      success: true,
      data: JSON.stringify(exportData, null, 2),
    };
  });

  // 导入数据
  ipcMain.handle('settings:import', (_, path: string) => {
    try {
      const content = readFileSync(path, 'utf-8');
      const data = JSON.parse(content);
      if (data.settings) {
        settingsCache = { ...settingsCache, ...data.settings };
        saveSettings(settingsCache);
        return { success: true, imported: 1 };
      }
      return { success: false, error: 'Invalid format' };
    } catch (error) {
      return { success: false, error: 'Import failed' };
    }
  });
}

