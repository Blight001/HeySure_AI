/**
 * 思维导图存储模块
 * 基于本地文件系统的数据持久化 (Electron)
 */

import { layoutEngine, defaultLayoutConfig } from './layout-engine';
import {
  MindmapNode,
  MindmapData,
  MindmapThemeConfig,
  FileCategory,
  CategoryStorageData,
  HistoryActionType,
  HistoryEntry,
  LayoutType,
  LayoutConfig
} from '../types';
import { presetThemes, getDefaultTheme } from '@/styles/theme';
import { storageService, isElectron } from './storage-service';
import * as nodeUtils from '../utils/node-utils';

// Re-export types for backward compatibility
export type {
  MindmapNode,
  MindmapData,
  MindmapThemeConfig,
  FileCategory,
  CategoryStorageData,
  HistoryActionType,
  HistoryEntry,
  LayoutType,
  LayoutConfig
};

// Re-export themes for backward compatibility
export { presetThemes, getDefaultTheme };

export class MindmapStorage {
  private categoryData: CategoryStorageData = {
    categories: [],
    selectedCategoryId: null,
    selectedMapId: null,
    maps: {}
  };
  private currentMap: MindmapData | null = null;
  private currentMapId: string | null = null;
  private nodeIndex: Record<string, MindmapNode> = {};
  // 撤销/重做历史栈
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxHistorySize = 50;
  // 撤销/重做状态标志
  private isUndoing = false;
  private isRedoing = false;
  // 布局配置
  private layoutConfig: LayoutConfig = { ...defaultLayoutConfig };
  
  // 自动保存定时器
  private saveTimer: NodeJS.Timeout | null = null;
  // 保存事件监听器
  private saveListeners: Set<() => void> = new Set();
  
  // 自动保存轮询定时器
  private autoSaveInterval: NodeJS.Timeout | null = null;
  // 上一次保存的导图数据快照（JSON字符串）
  private lastSavedSnapshot: string | null = null;

  setNodeHeights(heights: Record<string, number> | undefined) {
    this.layoutConfig.nodeHeights = heights;
  }

  /**
   * 订阅保存事件
   * @param callback 保存完成后的回调函数
   * @returns 取消订阅的函数
   */
  onSave(callback: () => void): () => void {
    this.saveListeners.add(callback);
    return () => {
      this.saveListeners.delete(callback);
    };
  }

  /**
   * 触发保存事件
   */
  private notifySave(): void {
    this.saveListeners.forEach(callback => callback());
  }

  /**
   * 初始化存储系统
   */
  async init(): Promise<void> {
    try {
      const data = await storageService.load();
      if (data) {
        this.categoryData = data;
        // 加载当前选中的分类
        if (this.categoryData.selectedCategoryId) {
          await this.loadMapFromCategory(this.categoryData.selectedCategoryId);
        } else if (this.categoryData.categories.length > 0) {
          await this.selectCategory(this.categoryData.categories[0].id);
        } else {
          this.initializeDefaultCategory();
        }
      } else {
        this.initializeDefaultCategory();
      }
      
      // 初始化完成后，启动自动保存轮询
      this.startAutoSavePolling();
      
      console.log('思维导图存储系统初始化成功');
      console.log(`已加载 ${this.categoryData.categories.length} 个分类`);
    } catch (error) {
      console.error('初始化存储系统失败:', error);
      this.initializeDefaultCategory();
      // 即使失败也启动轮询
      this.startAutoSavePolling();
    }
  }

  /**
   * 启动自动保存轮询
   * 每隔1秒检查一次当前导图数据是否与上次保存的一致
   */
  private startAutoSavePolling(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    // 初始化快照
    if (this.currentMap) {
      this.lastSavedSnapshot = JSON.stringify(this.currentMap);
    }

    this.autoSaveInterval = setInterval(async () => {
      await this.checkAndAutoSave();
    }, 1000);
  }

  /**
   * 检查并执行自动保存
   */
  private async checkAndAutoSave(): Promise<void> {
    if (!this.currentMap) return;

    // 序列化当前导图数据
    const currentSnapshot = JSON.stringify(this.currentMap);

    // 如果没有上次保存的快照，或者与快照不一致，则保存
    if (this.lastSavedSnapshot !== currentSnapshot) {
      // 更新快照
      this.lastSavedSnapshot = currentSnapshot;
      
      // 执行保存
      await storageService.saveMap(this.currentMap);
      await this.save(); // 保存索引
      
      // 通知 UI
      this.notifySave();
    }
  }

  /**
   * 销毁存储系统（清理定时器）
   */
  destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * 统一保存方法
   */
  private async save(): Promise<void> {
    await storageService.save(this.categoryData);
  }

  /**
   * 手动保存当前数据
   */
  async saveCurrentData(): Promise<void> {
    await this.save();
  }

  /**
   * 初始化默认分类
   */
  private initializeDefaultCategory(): void {
    const defaultCategory: FileCategory = {
      id: nodeUtils.generateId(),
      name: '默认分类',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mapIds: []
    };
    this.categoryData.categories = [defaultCategory];
    this.categoryData.selectedCategoryId = defaultCategory.id;

    // 创建默认思维导图
    const defaultMap = this.createEmptyMap('新思维导图');
    this.categoryData.maps[defaultMap.id] = defaultMap;
    defaultCategory.mapIds.push(defaultMap.id);

    this.currentMapId = defaultMap.id;
    this.currentMap = defaultMap;
    this.rebuildIndex();
    this.save();
    
    // 更新快照
    if (this.currentMap) {
      this.lastSavedSnapshot = JSON.stringify(this.currentMap);
    }
  }

  /**
   * 创建空的思维导图
   */
  private createEmptyMap(name: string): MindmapData {
    const rootId = nodeUtils.generateId();
    return {
      id: nodeUtils.generateId(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [{
        id: rootId,
        name: '中心主题',
        parentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        lastUsed: new Date().toISOString(),
        contexts: [],
        children: [],
        isRoot: true,
        x: 0,
        y: 0
      }],
      version: 1
    };
  }

  /**
   * 从分类加载思维导图
   */
  private async loadMapFromCategory(categoryId: string): Promise<void> {
    const category = this.categoryData.categories.find(c => c.id === categoryId);
    if (!category) return;

    if (category.mapIds.length > 0) {
      // 优先加载上次选中的思维导图
      let mapId = this.categoryData.selectedMapId;
      
      // 验证 selectedMapId 是否属于当前分类
      if (!mapId || !category.mapIds.includes(mapId)) {
        mapId = category.mapIds[0];
      }

      this.currentMapId = mapId;
      this.categoryData.selectedMapId = mapId; // 确保 selectedMapId 有效
      this.currentMap = this.categoryData.maps[mapId] || null;
    } else {
      // 分类为空，创建一个新的
      const newMap = this.createEmptyMap('新思维导图');
      this.categoryData.maps[newMap.id] = newMap;
      category.mapIds.push(newMap.id);
      this.currentMapId = newMap.id;
      this.categoryData.selectedMapId = newMap.id;
      this.currentMap = newMap;
    }
    this.rebuildIndex();
    // 加载导图时更新所有节点的重复序号
    this.updateAllDuplicateIndices();
    
    // 更新快照
    if (this.currentMap) {
      this.lastSavedSnapshot = JSON.stringify(this.currentMap);
    }
  }

  /**
   * 重建节点索引
   */
  private rebuildIndex(): void {
    if (this.currentMap?.nodes) {
      this.nodeIndex = nodeUtils.rebuildNodeIndex(this.currentMap.nodes);
    } else {
      this.nodeIndex = {};
    }
  }

  // ==================== 分类管理方法 ====================

  getCategories(): FileCategory[] {
    return this.categoryData.categories;
  }

  getSelectedCategory(): FileCategory | null {
    if (!this.categoryData.selectedCategoryId) return null;
    return this.categoryData.categories.find(c => c.id === this.categoryData.selectedCategoryId) || null;
  }

  getSelectedCategoryId(): string | null {
    return this.categoryData.selectedCategoryId;
  }

  async addCategory(name: string): Promise<FileCategory> {
    const newCategory: FileCategory = {
      id: nodeUtils.generateId(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mapIds: []
    };
    this.categoryData.categories.push(newCategory);
    await this.save();
    return newCategory;
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const categoryIndex = this.categoryData.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) return false;

    const category = this.categoryData.categories[categoryIndex];

    // 删除该分类下的所有思维导图
    for (const mapId of category.mapIds) {
      delete this.categoryData.maps[mapId];
    }

    // 删除分类
    this.categoryData.categories.splice(categoryIndex, 1);

    // 如果删除的是当前选中的分类，切换到其他分类
    if (this.categoryData.selectedCategoryId === categoryId) {
      if (this.categoryData.categories.length > 0) {
        await this.selectCategory(this.categoryData.categories[0].id);
      } else {
        // 没有分类了，创建新的
        this.categoryData.selectedCategoryId = null;
        this.currentMapId = null;
        this.currentMap = null;
      }
    }

    await this.save();
    return true;
  }

  async renameCategory(categoryId: string, name: string): Promise<boolean> {
    const category = this.categoryData.categories.find(c => c.id === categoryId);
    if (!category) return false;

    category.name = name;
    category.updatedAt = new Date().toISOString();
    await this.save();
    return true;
  }

  async selectCategory(categoryId: string): Promise<boolean> {
    const category = this.categoryData.categories.find(c => c.id === categoryId);
    if (!category) return false;

    this.categoryData.selectedCategoryId = categoryId;
    await this.loadMapFromCategory(categoryId);
    await this.save();
    return true;
  }

  // ==================== 思维导图管理方法 ====================

  getCurrentMap(): MindmapData | null {
    return this.currentMap;
  }

  getCurrentMapId(): string | null {
    return this.currentMapId;
  }

  getNodeIndex(): Record<string, MindmapNode> {
    return this.nodeIndex;
  }

  async createNewMap(name: string = '新思维导图'): Promise<MindmapData> {
    const categoryId = this.categoryData.selectedCategoryId;
    if (!categoryId) throw new Error('没有选中的分类');

    const newMap = this.createEmptyMap(name);
    this.categoryData.maps[newMap.id] = newMap;

    const category = this.categoryData.categories.find(c => c.id === categoryId);
    if (category) {
      category.mapIds.push(newMap.id);
      category.updatedAt = new Date().toISOString();
    }

    // 切换到新创建的思维导图
    this.currentMapId = newMap.id;
    this.categoryData.selectedMapId = newMap.id;
    this.currentMap = newMap;
    this.rebuildIndex();
    await this.save();
    return newMap;
  }

  async deleteCurrentMap(): Promise<boolean> {
    if (!this.currentMapId || !this.categoryData.selectedCategoryId) return false;

    const category = this.categoryData.categories.find(c => c.id === this.categoryData.selectedCategoryId);
    if (!category) return false;

    // 从分类中移除
    category.mapIds = category.mapIds.filter(id => id !== this.currentMapId);
    delete this.categoryData.maps[this.currentMapId];

    // 切换到其他思维导图或创建新的
    if (category.mapIds.length > 0) {
      await this.loadMapFromCategory(this.categoryData.selectedCategoryId);
    } else {
      // 分类为空，创建新的
      const newMap = this.createEmptyMap('新思维导图');
      this.categoryData.maps[newMap.id] = newMap;
      category.mapIds.push(newMap.id);
      this.currentMapId = newMap.id;
      this.categoryData.selectedMapId = newMap.id;
      this.currentMap = newMap;
      this.rebuildIndex();
    }

    await this.save();
    
    // 更新快照
    if (this.currentMap) {
      this.lastSavedSnapshot = JSON.stringify(this.currentMap);
    }
    
    return true;
  }

  async renameMapById(mapId: string, name: string): Promise<boolean> {
    const map = this.categoryData.maps[mapId];
    if (!map) return false;

    map.name = name;
    map.updatedAt = new Date().toISOString();
    
    // If it's the current map, update it too
    if (this.currentMap && this.currentMap.id === mapId) {
      this.currentMap.name = name;
      this.currentMap.updatedAt = map.updatedAt;
    }
    
    await this.save();
    await storageService.saveMap(map);
    
    return true;
  }

  async switchMap(mapId: string): Promise<boolean> {
    const category = this.getSelectedCategory();
    if (!category || !category.mapIds.includes(mapId)) return false;

    this.currentMapId = mapId;
    this.categoryData.selectedMapId = mapId;
    this.currentMap = this.categoryData.maps[mapId] || null;
    this.rebuildIndex();
    // 切换导图时更新所有节点的重复序号
    this.updateAllDuplicateIndices();
    await this.save();
    
    // 更新快照
    if (this.currentMap) {
      this.lastSavedSnapshot = JSON.stringify(this.currentMap);
    }
    
    return true;
  }

  getMapsInCategory(): MindmapData[] {
    const category = this.getSelectedCategory();
    if (!category) return [];
    return category.mapIds.map(id => this.categoryData.maps[id]).filter(Boolean);
  }

  getLayoutType(): LayoutType {
    return this.currentMap?.layoutType || 'tree-right';
  }

  async setLayoutType(type: LayoutType): Promise<void> {
    if (!this.currentMap) return;
    this.currentMap.layoutType = type;
    this.layoutConfig = { ...defaultLayoutConfig, type };
    await this.relayoutEntireMap();
  }

  private async applyLayoutToNodes(saveAfterLayout: boolean = false): Promise<void> {
    if (!this.currentMap) return;

    const layoutType = this.getLayoutType();
    const result = layoutEngine.applyLayout(this.currentMap.nodes, layoutType, this.layoutConfig);

    for (const [id, pos] of result.positions) {
      const node = this.nodeIndex[id];
      if (node) {
        node.x = pos.x;
        node.y = pos.y;
      }
    }

    if (saveAfterLayout && this.currentMap) {
      this.currentMap.updatedAt = new Date().toISOString();
      await this.saveCurrentMap();
    }
  }

  private async saveCurrentMap(immediate = false): Promise<void> {
    if (!this.currentMap) return;

    // 清除之前的定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    const mapToSave = this.currentMap;
    const doSave = async () => {
      await storageService.saveMap(mapToSave);
      // 在 Electron 环境下也调用 save() 以确保 CategoryStorageData 中的 maps 数据被更新
      // 这样下次启动时能正确加载最新的 viewState 等信息
      await this.save();
      
      // 更新快照
      this.lastSavedSnapshot = JSON.stringify(mapToSave);
      
      this.notifySave();
    };

    if (immediate) {
      await doSave();
    } else {
      // 在新的轮询机制下，普通保存操作不再启动定时器，
      // 而是由 checkAndAutoSave 定时检查
      // 这里留空，让轮询去处理
    }
  }

  // ==================== 节点序号管理方法 ====================

  /**
   * 计算节点的重复序号
   * 遍历所有节点，统计名称相同的节点数量，返回当前节点是第几个
   * @param nodeName 节点名称
   * @param nodeId 当前节点ID（排除自己）
   * @returns 序号（如果是第一个则返回 1，第二个返回 2，以此类推）
   */
  private calculateDuplicateIndex(nodeName: string, nodeId?: string): number | undefined {
    if (!nodeName.trim()) return undefined;

    // 收集所有导图中的所有节点
    const allNodes: Array<{ id: string; name: string; mapId: string }> = [];
    Object.values(this.categoryData.maps).forEach(map => {
      if (map.nodes) {
        map.nodes.forEach(node => {
          allNodes.push({ id: node.id, name: node.name, mapId: map.id });
        });
      }
    });

    // 过滤出同名节点
    const sameNameNodes = allNodes.filter(n => n.name === nodeName);
    
    // 如果当前节点是新节点（nodeId 不在列表中），我们需要假设它被添加后的情况
    // 但由于我们无法确定新节点的排序位置（依赖于 ID），这里只返回一个临时值
    // 真正的序号会在 updateAllDuplicateIndices 中计算
    
    if (sameNameNodes.length === 0) return undefined;
    
    // 如果是更新现有节点
    if (nodeId) {
      // 排序：MapID -> NodeID
      sameNameNodes.sort((a, b) => {
        if (a.mapId !== b.mapId) return a.mapId.localeCompare(b.mapId);
        return a.id.localeCompare(b.id);
      });
      
      const index = sameNameNodes.findIndex(n => n.id === nodeId);
      return index >= 0 ? index + 1 : undefined;
    }

    // 新节点，返回当前数量 + 1 作为临时序号
    return sameNameNodes.length + 1;
  }

  /**
   * 更新所有相同名称节点的序号（跨所有导图）
   */
  private updateAllDuplicateIndices(): void {
    // 收集所有导图中的所有节点引用
    const allNodes: Array<{ node: MindmapNode; mapId: string }> = [];
    
    Object.values(this.categoryData.maps).forEach(map => {
      if (map.nodes) {
        map.nodes.forEach(node => {
          allNodes.push({ node, mapId: map.id });
        });
      }
    });

    // 按名称分组
    const groups: Record<string, typeof allNodes> = {};
    for (const item of allNodes) {
      const name = item.node.name;
      if (!groups[name]) groups[name] = [];
      groups[name].push(item);
    }

    // 为每个组分配序号
    for (const name in groups) {
      const group = groups[name];
      if (group.length > 1) {
        // 排序确保序号稳定：MapID -> NodeID
        group.sort((a, b) => {
          if (a.mapId !== b.mapId) return a.mapId.localeCompare(b.mapId);
          return a.node.id.localeCompare(b.node.id);
        });
        
        // 分配序号
        group.forEach((item, index) => {
          item.node.duplicateIndex = index + 1;
        });
      } else {
        // 只有一个节点，清除序号
        group[0].node.duplicateIndex = undefined;
      }
    }
  }

  /**
   * 重新计算当前思维导图中所有节点的序号
   */
  recalculateAllDuplicateIndices(): void {
    this.updateAllDuplicateIndices();
  }

  async addNode(parentId: string, name: string, options?: Partial<MindmapNode>): Promise<MindmapNode> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const parentNode = this.nodeIndex[parentId];
    if (!parentNode) throw new Error('父节点不存在');

    // 计算新节点的序号
    const duplicateIndex = this.calculateDuplicateIndex(name);

    const newNode: MindmapNode = {
      id: nodeUtils.generateId(),
      name,
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      lastUsed: new Date().toISOString(),
      contexts: [],
      children: [],
      x: 0,
      y: 0,
      color: '#3b82f6',
      duplicateIndex,
      ...options
    };

    this.currentMap.nodes.push(newNode);
    parentNode.children.push(newNode.id);

    // 更新其他同名节点的序号
    this.updateAllDuplicateIndices();

    this.rebuildIndex();
    await this.applyLayoutToNodes(true);

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'add',
      timestamp: new Date().toISOString(),
      data: { nodeId: newNode.id, parentId, nodes: [nodeUtils.cloneNodeSnapshot(newNode)] },
      description: `添加节点: ${name}`
    });

    return newNode;
  }

  async relayoutEntireMap(): Promise<void> {
    await this.applyLayoutToNodes(true);
  }

  async updateNode(nodeId: string, data: Partial<MindmapNode>): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    if (!node) throw new Error('节点不存在');

    const before = { ...node };
    Object.assign(node, data);
    node.updatedAt = new Date().toISOString();

    // 如果名称改变，重新计算序号
    if (data.name !== undefined && data.name !== before.name) {
      node.duplicateIndex = this.calculateDuplicateIndex(data.name, nodeId);
      this.updateAllDuplicateIndices();
    }

    let description = '更新节点';
    if (data.name) {
      description = `更新节点名称: ${data.name}`;
    }

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'update',
      timestamp: new Date().toISOString(),
      data: { nodeId, before, after: { ...node } as MindmapNode },
      description
    });

    await this.saveCurrentMap();
  }

  async deleteNode(nodeId: string): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    if (!node) throw new Error('节点不存在');
    if (node.isRoot) throw new Error('不能删除根节点');

    const nodesToDelete = nodeUtils.getAllDescendants(nodeId, this.nodeIndex);
    nodesToDelete.push(nodeId);

    const parentId = node.parentId;
    if (parentId) {
      const parentNode = this.nodeIndex[parentId];
      if (parentNode) {
        parentNode.children = parentNode.children.filter(id => id !== nodeId);
      }
    }

    this.currentMap.nodes = this.currentMap.nodes.filter(n => !nodesToDelete.includes(n.id));

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'delete',
      timestamp: new Date().toISOString(),
      data: {
        nodeId,
        parentId: parentId || undefined,
        nodes: nodesToDelete.map(id => nodeUtils.cloneNodeSnapshot(this.nodeIndex[id]))
      },
      description: `删除节点: ${node.name}`
    });

    // 删除节点后，重新计算其他同名节点的序号
    this.updateAllDuplicateIndices();

    await this.applyLayoutToNodes(true);
    this.rebuildIndex();
  }

  async moveNode(nodeId: string, x: number, y: number): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    if (!node) throw new Error('节点不存在');

    node.x = x;
    node.y = y;
    node.updatedAt = new Date().toISOString();

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'move',
      timestamp: new Date().toISOString(),
      data: { nodeId },
      description: `移动节点: ${node.name}`
    });

    await this.saveCurrentMap();
  }

  async reparentNode(nodeId: string, newParentId: string, index?: number): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    const newParent = this.nodeIndex[newParentId];
    if (!node) throw new Error('节点不存在');
    if (!newParent) throw new Error('新的父节点不存在');

    const oldParentId = node.parentId;
    if (oldParentId) {
      const oldParent = this.nodeIndex[oldParentId];
      if (oldParent) {
        oldParent.children = oldParent.children.filter(id => id !== nodeId);
      }
    }

    node.parentId = newParentId;
    if (typeof index === 'number' && index >= 0 && index <= newParent.children.length) {
      newParent.children.splice(index, 0, nodeId);
    } else {
      newParent.children.push(nodeId);
    }

    node.updatedAt = new Date().toISOString();

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'reparent',
      timestamp: new Date().toISOString(),
      data: { nodeId, beforeParentId: oldParentId || undefined, afterParentId: newParentId },
      description: `移动节点父级: ${node.name}`
    });

    await this.applyLayoutToNodes(true);
    this.rebuildIndex();
  }

  async swapSiblings(nodeId: string, withNodeId?: string, direction?: 'up' | 'down'): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    if (!node) throw new Error('节点不存在');
    const parentId = node.parentId;
    if (!parentId) throw new Error('根节点无法交换');
    const parent = this.nodeIndex[parentId];
    if (!parent) throw new Error('父节点不存在');

    const idx = parent.children.indexOf(nodeId);
    if (idx < 0) return;
    let targetIdx = -1;
    if (withNodeId) {
      targetIdx = parent.children.indexOf(withNodeId);
    } else if (direction === 'up') {
      targetIdx = idx - 1;
    } else if (direction === 'down') {
      targetIdx = idx + 1;
    }
    if (targetIdx < 0 || targetIdx >= parent.children.length) return;

    const tmp = parent.children[idx];
    parent.children[idx] = parent.children[targetIdx];
    parent.children[targetIdx] = tmp;

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'reorder',
      timestamp: new Date().toISOString(),
      data: { nodeId, withNodeId: parent.children[idx], parentId },
      description: `交换顺序: ${node.name}`
    });

    await this.applyLayoutToNodes(true);
    this.rebuildIndex();
  }

  async promoteNode(nodeId: string): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    if (!node) throw new Error('节点不存在');
    const parentId = node.parentId;
    if (!parentId) return;
    const parent = this.nodeIndex[parentId];
    const grandId = parent.parentId;
    if (!grandId) return;

    await this.reparentNode(nodeId, grandId);
  }

  async demoteNode(nodeId: string): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    if (!node) throw new Error('节点不存在');
    const parentId = node.parentId;
    if (!parentId) throw new Error('根节点无法降级');
    const parent = this.nodeIndex[parentId];
    if (!parent) throw new Error('父节点不存在');
    const idx = parent.children.indexOf(nodeId);
    if (idx <= 0) return;
    const prevSiblingId = parent.children[idx - 1];
    await this.reparentNode(nodeId, prevSiblingId);
  }

  async toggleCollapse(nodeId: string): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    if (!node) throw new Error('节点不存在');

    node.collapsed = !node.collapsed;
    node.updatedAt = new Date().toISOString();

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'collapse',
      timestamp: new Date().toISOString(),
      data: { nodeId },
      description: `${node.collapsed ? '折叠' : '展开'}节点: ${node.name}`
    });

    await this.saveCurrentMap();
  }

  async updateNodeColor(nodeId: string, color: string): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    if (!node) throw new Error('节点不存在');

    const before = { ...node };
    node.color = color;
    node.updatedAt = new Date().toISOString();

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'color',
      timestamp: new Date().toISOString(),
      data: {
        nodeId,
        before,
        after: { ...node, color } as MindmapNode
      },
      description: `更新节点颜色: ${node.name}`
    });

    await this.saveCurrentMap();
  }

  async updateViewState(scale: number, x: number, y: number): Promise<void> {
    if (!this.currentMap) return;
    
    this.currentMap.viewState = { scale, x, y };
    // 更新缓存中的导图数据
    if (this.categoryData.maps[this.currentMap.id]) {
      this.categoryData.maps[this.currentMap.id].viewState = { scale, x, y };
    }
    
    // 这是一个频繁操作，只更新内存和单个文件，避免频繁触发全量索引保存
    // 注意：这里我们不调用 this.save() 来保存分类索引，因为 viewState 改变不需要立即反映在索引中
    // 只有在其他重要操作（如重命名、切换分类）时才一起保存索引
    // 使用防抖保存
    await this.saveCurrentMap(false);
  }

  async updateAiConfig(config: { selectedModelId: string; allowReadMindmap: boolean; allowAiEdit: boolean }): Promise<void> {
    if (!this.currentMap) return;
    this.currentMap.aiConfig = config;
    // Update cache
    if (this.categoryData.maps[this.currentMap.id]) {
      this.categoryData.maps[this.currentMap.id].aiConfig = config;
    }
    await this.saveCurrentMap();
  }

  getViewState(): { scale: number; x: number; y: number } | undefined {
    return this.currentMap?.viewState;
  }

  async renameMap(name: string): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    await this.renameMapById(this.currentMap.id, name);
  }

  async clearMap(): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const beforeSnapshot = nodeUtils.cloneMapSnapshot(this.currentMap);
    const rootId = nodeUtils.generateId();
    this.currentMap = {
      id: this.currentMap.id,
      name: this.currentMap.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [{
        id: rootId,
        name: '中心主题',
        parentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        lastUsed: new Date().toISOString(),
        contexts: [],
        children: [],
        isRoot: true,
        x: 0,
        y: 0
      }],
      version: 1
    };

    const afterSnapshot = nodeUtils.cloneMapSnapshot(this.currentMap);
    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'clear',
      timestamp: new Date().toISOString(),
      data: { before: beforeSnapshot, after: afterSnapshot },
      description: '清空思维导图'
    });

    this.rebuildIndex();
    await this.saveCurrentMap(true);
  }

  exportData(): string {
    if (!this.currentMap) return '{}';
    return JSON.stringify(this.currentMap, null, 2);
  }

  async importData(data: string): Promise<void> {
    if (!this.currentMapId) throw new Error('没有当前思维导图');
    const beforeSnapshot = this.currentMap ? nodeUtils.cloneMapSnapshot(this.currentMap) : null;
    const parsed = JSON.parse(data) as MindmapData;

    if (!parsed.id || !parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error('无效的数据格式');
    }

    parsed.id = this.currentMapId;
    this.currentMap = parsed;
    this.categoryData.maps[this.currentMapId] = parsed;

    this.rebuildIndex();

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'clear',
      timestamp: new Date().toISOString(),
      data: {
        before: beforeSnapshot || undefined,
        after: nodeUtils.cloneMapSnapshot(this.currentMap)
      },
      description: `导入思维导图: ${parsed.name}`
    });

    await this.saveCurrentMap(true);
  }

  private recordHistory(entry: HistoryEntry): void {
    if (this.isUndoing || this.isRedoing) return;
    this.undoStack.push(entry);
    this.redoStack = [];
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  async undo(): Promise<boolean> {
    if (this.undoStack.length === 0) return false;
    const entry = this.undoStack.pop()!;
    this.redoStack.push(entry);
    this.isUndoing = true;
    try {
      await this.applyUndo(entry);
    } finally {
      this.isUndoing = false;
    }
    return true;
  }

  async redo(): Promise<boolean> {
    if (this.redoStack.length === 0) return false;
    const entry = this.redoStack.pop()!;
    this.undoStack.push(entry);
    this.isRedoing = true;
    try {
      await this.applyRedo(entry);
    } finally {
      this.isRedoing = false;
    }
    return true;
  }

  private async applyUndo(entry: HistoryEntry): Promise<void> {
    if (!this.currentMap) return;

    switch (entry.type) {
      case 'add':
        if (entry.data.nodeId) {
          // 这里我们手动删除，不记录历史
          const nodeId = entry.data.nodeId;
          const nodesToDelete = nodeUtils.getAllDescendants(nodeId, this.nodeIndex);
          nodesToDelete.push(nodeId);
          
          const node = this.nodeIndex[nodeId];
          if (node && node.parentId) {
             const parent = this.nodeIndex[node.parentId];
             if (parent) {
               parent.children = parent.children.filter(id => id !== nodeId);
             }
          }
          this.currentMap.nodes = this.currentMap.nodes.filter(n => !nodesToDelete.includes(n.id));
          this.rebuildIndex();
          await this.saveCurrentMap();
        }
        break;
      case 'delete':
        if (entry.data.nodes) {
          for (const node of entry.data.nodes) {
            this.currentMap.nodes.push(node);
          }
          this.rebuildIndex();
          if (entry.data.parentId && entry.data.nodeId) {
            const parent = this.nodeIndex[entry.data.parentId];
            if (parent && !parent.children.includes(entry.data.nodeId)) {
              parent.children.push(entry.data.nodeId);
            }
          }
          await this.saveCurrentMap();
        }
        break;
      case 'update':
        if (entry.data.nodeId && entry.data.before) {
          Object.assign(this.nodeIndex[entry.data.nodeId], entry.data.before);
          await this.saveCurrentMap();
        }
        break;
      case 'move':
        break;
      case 'collapse':
        if (entry.data.nodeId) {
          await this.toggleCollapse(entry.data.nodeId);
        }
        break;
      case 'color':
        if (entry.data.nodeId && entry.data.before) {
          const beforeColor = (entry.data.before as unknown as MindmapNode).color;
          this.nodeIndex[entry.data.nodeId].color = beforeColor;
          await this.saveCurrentMap();
        }
        break;
      case 'theme':
        if (entry.data.before) {
          this.currentMap.theme = entry.data.before as unknown as MindmapThemeConfig;
          await this.saveCurrentMap();
        }
        break;
      case 'clear':
        if (entry.data.before) {
          this.currentMap = entry.data.before as MindmapData;
          this.rebuildIndex();
          await this.saveCurrentMap();
        }
        break;
    }
  }

  private async applyRedo(entry: HistoryEntry): Promise<void> {
    if (!this.currentMap) return;

    switch (entry.type) {
      case 'add':
        if (entry.data.parentId && entry.data.nodeId) {
          const nodeData = entry.data.nodes?.[0];
          if (nodeData) {
            this.currentMap.nodes.push(nodeData);
            const parent = this.nodeIndex[entry.data.parentId!];
            if (parent) {
              parent.children.push(nodeData.id);
            }
            this.rebuildIndex();
            await this.saveCurrentMap();
          }
        }
        break;
      case 'delete':
        if (entry.data.nodeId) {
           // 重新执行删除逻辑
           const nodeId = entry.data.nodeId;
           const nodesToDelete = nodeUtils.getAllDescendants(nodeId, this.nodeIndex);
           nodesToDelete.push(nodeId);
           const node = this.nodeIndex[nodeId];
           if (node && node.parentId) {
              const parent = this.nodeIndex[node.parentId];
              if (parent) {
                parent.children = parent.children.filter(id => id !== nodeId);
              }
           }
           this.currentMap.nodes = this.currentMap.nodes.filter(n => !nodesToDelete.includes(n.id));
           this.rebuildIndex();
           await this.saveCurrentMap();
        }
        break;
      case 'update':
        if (entry.data.nodeId && entry.data.after) {
          Object.assign(this.nodeIndex[entry.data.nodeId], entry.data.after);
          await this.saveCurrentMap();
        }
        break;
      case 'move':
        break;
      case 'collapse':
        if (entry.data.nodeId) {
          await this.toggleCollapse(entry.data.nodeId);
        }
        break;
      case 'color':
        if (entry.data.nodeId && entry.data.after) {
          const afterColor = (entry.data.after as unknown as MindmapNode).color;
          this.nodeIndex[entry.data.nodeId].color = afterColor;
          await this.saveCurrentMap();
        }
        break;
      case 'theme':
        if (entry.data.after) {
          this.currentMap.theme = entry.data.after as unknown as MindmapThemeConfig;
          await this.saveCurrentMap();
        }
        break;
      case 'clear':
        if (entry.data.after) {
          this.currentMap = entry.data.after as MindmapData;
          this.rebuildIndex();
          await this.saveCurrentMap();
        }
        break;
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  async addSiblingNode(nodeId: string, name: string): Promise<MindmapNode> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    if (!node) throw new Error('节点不存在');
    if (node.isRoot) throw new Error('根节点无法创建兄弟节点');
    
    const parentId = node.parentId!;
    const parent = this.nodeIndex[parentId];
    if (!parent) throw new Error('父节点不存在');

    const newNode: MindmapNode = {
      id: nodeUtils.generateId(),
      name,
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      lastUsed: new Date().toISOString(),
      contexts: [],
      children: [],
      x: 0,
      y: 0,
      color: '#3b82f6'
    };

    this.currentMap.nodes.push(newNode);
    
    const index = parent.children.indexOf(nodeId);
    if (index !== -1) {
        parent.children.splice(index + 1, 0, newNode.id);
    } else {
        parent.children.push(newNode.id);
    }

    this.rebuildIndex();
    await this.applyLayoutToNodes(true);

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'add',
      timestamp: new Date().toISOString(),
      data: { nodeId: newNode.id, parentId, nodes: [nodeUtils.cloneNodeSnapshot(newNode)] },
      description: `添加兄弟节点: ${name}`
    });

    return newNode;
  }

  async copyNode(nodeId: string): Promise<{ node: MindmapNode; children: MindmapNode[] } | null> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const node = this.nodeIndex[nodeId];
    if (!node) return null;

    const descendants = nodeUtils.getAllDescendantsWithData(nodeId, this.nodeIndex);
    const allNodes = [node, ...descendants];
    const idMapping = nodeUtils.generateIdMapping(allNodes);
    
    const clonedNodes = allNodes.map(n => nodeUtils.applyIdMapping(n, idMapping));
    const newRoot = clonedNodes.find(n => n.id === idMapping[node.id]);
    const newChildren = clonedNodes.filter(n => n.id !== newRoot?.id);

    if (!newRoot) return null;

    return { node: newRoot, children: newChildren };
  }

  async cutNode(nodeId: string): Promise<{ node: MindmapNode; children: MindmapNode[] } | null> {
    const data = await this.copyNode(nodeId);
    if (data) {
      await this.deleteNode(nodeId);
    }
    return data;
  }

  async pasteNode(parentId: string, nodeData: { node: MindmapNode; children: MindmapNode[] }): Promise<MindmapNode | null> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const parentNode = this.nodeIndex[parentId];
    if (!parentNode) return null;

    const { node: rootNode, children } = nodeData;
    const allNodes = [rootNode, ...children];
    
    const idMapping = nodeUtils.generateIdMapping(allNodes);
    const finalNodes = allNodes.map(n => {
        const newNode = nodeUtils.applyIdMapping(n, idMapping);
        newNode.createdAt = new Date().toISOString();
        newNode.updatedAt = new Date().toISOString();
        return newNode;
    });

    const newRoot = finalNodes.find(n => n.id === idMapping[rootNode.id]);
    if (!newRoot) return null;

    newRoot.parentId = parentId;
    // Position it roughly near parent or let layout handle it
    newRoot.x = (parentNode.x || 0) + 200; 
    newRoot.y = parentNode.y || 0;

    parentNode.children.push(newRoot.id);
    this.currentMap.nodes.push(...finalNodes);

    await this.applyLayoutToNodes(true);
    this.rebuildIndex();

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'add',
      timestamp: new Date().toISOString(),
      data: { 
        nodeId: newRoot.id, 
        parentId, 
        nodes: finalNodes.map(n => nodeUtils.cloneNodeSnapshot(n))
      },
      description: `粘贴节点: ${newRoot.name}`
    });

    await this.save();
    return newRoot;
  }

  async updateTheme(themeId: string): Promise<void> {
    if (!this.currentMap) throw new Error('没有当前思维导图');
    const theme = presetThemes[themeId];
    if (!theme) throw new Error('主题不存在');

    const beforeTheme = this.currentMap.theme || getDefaultTheme();
    this.currentMap.theme = theme;
    this.currentMap.updatedAt = new Date().toISOString();

    this.recordHistory({
      id: nodeUtils.generateId(),
      type: 'theme',
      timestamp: new Date().toISOString(),
      data: {
        before: beforeTheme as unknown as MindmapNode | MindmapData,
        after: theme as unknown as MindmapNode | MindmapData
      },
      description: `切换主题: ${theme.name}`
    });

    await this.saveCurrentMap();
  }

  // ==================== 跨文件节点搜索方法 ====================

  /**
   * 搜索所有思维导图中名称相同的节点
   * @param nodeName 要搜索的节点名称
   * @param excludeMapId 可选，排除的思维导图ID（当前编辑的）
   * @returns 返回匹配节点的数组，包含思维导图名称、节点ID和节点名称
   */
  searchNodesByName(nodeName: string, excludeMapId?: string): Array<{
    mapId: string;
    mapName: string;
    nodeId: string;
    nodeName: string;
    categoryName: string;
    duplicateIndex?: number;
  }> {
    if (!nodeName.trim()) return [];

    const results: Array<{
      mapId: string;
      mapName: string;
      nodeId: string;
      nodeName: string;
      categoryName: string;
      duplicateIndex?: number;
    }> = [];

    // 使用精确匹配，与 duplicateIndex 逻辑保持一致
    const searchName = nodeName.trim();

    // 遍历所有分类
    for (const category of this.categoryData.categories) {
      // 遍历该分类下的所有思维导图
      for (const mapId of category.mapIds) {
        // 排除当前思维导图
        if (excludeMapId && mapId === excludeMapId) continue;

        const map = this.categoryData.maps[mapId];
        if (!map || !map.nodes) continue;

        // 搜索匹配的节点
        for (const node of map.nodes) {
          // 精确匹配（忽略首尾空格）
          if (node.name.trim() === searchName) {
            results.push({
              mapId: map.id,
              mapName: map.name,
              nodeId: node.id,
              nodeName: node.name,
              categoryName: category.name,
              duplicateIndex: node.duplicateIndex
            });
          }
        }
      }
    }

    // 排序结果，确保顺序与 duplicateIndex 一致 (MapID -> NodeID)
    results.sort((a, b) => {
      if (a.mapId !== b.mapId) return a.mapId.localeCompare(b.mapId);
      return a.nodeId.localeCompare(b.nodeId);
    });

    return results;
  }

  /**
   * 获取所有思维导图的基本信息（用于显示）
   */
  getAllMapsInfo(): Array<{
    mapId: string;
    mapName: string;
    categoryName: string;
  }> {
    const results: Array<{
      mapId: string;
      mapName: string;
      categoryName: string;
    }> = [];

    for (const category of this.categoryData.categories) {
      for (const mapId of category.mapIds) {
        const map = this.categoryData.maps[mapId];
        if (map) {
          results.push({
            mapId: map.id,
            mapName: map.name,
            categoryName: category.name
          });
        }
      }
    }

    return results;
  }
}

export const mindmapStorage = new MindmapStorage();
