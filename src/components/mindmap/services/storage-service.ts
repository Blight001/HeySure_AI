import { CategoryStorageData, MindmapData } from '../types';

// 检查是否在 Electron 环境中
export const isElectron = (): boolean => {
  return !!(window.electronAPI && window.electronAPI.mindmapGetData);
};

export class StorageService {
  /**
   * 加载数据
   */
  async load(): Promise<CategoryStorageData | null> {
    if (isElectron()) {
      return this.loadFromFile();
    } else {
      return this.loadFromStorage();
    }
  }

  /**
   * 保存数据
   */
  async save(data: CategoryStorageData): Promise<void> {
    if (isElectron()) {
      await this.saveToFile(data);
    } else {
      await this.saveToStorage(data);
    }
  }

  /**
   * 保存单个思维导图数据
   */
  async saveMap(map: MindmapData): Promise<void> {
    if (isElectron()) {
      await window.electronAPI?.mindmapSave(map);
    } else {
      // 浏览器环境中更新 maps 数据并保存到 localStorage
      const data = localStorage.getItem('hey_sure_mindmap_data');
      if (data) {
        try {
          const categoryData = JSON.parse(data) as CategoryStorageData;
          categoryData.maps[map.id] = map;
          localStorage.setItem('hey_sure_mindmap_data', JSON.stringify(categoryData));
        } catch (error) {
          console.error('Failed to save map to localStorage:', error);
        }
      }
    }
  }

  /**
   * 从本地文件系统加载数据 (Electron)
   */
  private async loadFromFile(): Promise<CategoryStorageData | null> {
    const data = await window.electronAPI?.mindmapGetData();
    return data || null;
  }

  /**
   * 从 localStorage 加载数据 (浏览器)
   */
  private async loadFromStorage(): Promise<CategoryStorageData | null> {
    const data = localStorage.getItem('hey_sure_mindmap_data');
    if (data) {
      return JSON.parse(data) as CategoryStorageData;
    }
    return null;
  }

  /**
   * 保存数据到本地文件系统 (Electron)
   */
  private async saveToFile(data: CategoryStorageData): Promise<void> {
    await window.electronAPI?.mindmapSaveData(data);
  }

  /**
   * 保存数据到 localStorage (浏览器)
   */
  private async saveToStorage(data: CategoryStorageData): Promise<void> {
    localStorage.setItem('hey_sure_mindmap_data', JSON.stringify(data));
  }
}

export const storageService = new StorageService();
