/**
 * 流程存储模块
 * 基于本地文件系统的数据持久化 (Electron)
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  FlowDefinition,
  FlowNode,
  FlowEdge,
  FlowSettings,
  FlowMetadata,
  FlowViewState,
} from '@/types/flow';

// ============ 类型定义 ============

export interface FlowCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  flowIds: string[];
}

export interface FlowCategoryStorageData {
  categories: FlowCategory[];
  selectedCategoryId: string | null;
  selectedFlowId: string | null;  // 记住上次打开的流程ID
  flows: Record<string, FlowDefinition>;
}

export interface FlowListItem {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  nodeCount: number;
  edgeCount: number;
}

// ============ 默认配置 ============

const defaultFlowSettings: FlowSettings = {
  executionMode: 'async',
  timeout: 300,
  retryOnError: false,
  maxRetries: 3,
};

const defaultFlowMetadata: FlowMetadata = {
  author: '',
  tags: [],
  isTemplate: false,
  templateCategory: undefined,
};

// ============ 存储服务 ============

class FlowStorageService {
  private data: FlowCategoryStorageData = {
    categories: [],
    selectedCategoryId: null,
    selectedFlowId: null,
    flows: {},
  };
  private currentFlowId: string | null = null;
  
  // 自动保存定时器
  private saveTimer: NodeJS.Timeout | null = null;
  // 保存事件监听器
  private saveListeners: Set<() => void> = new Set();
  // 流程切换监听器
  private flowSwitchListeners: Set<(flowId: string) => void> = new Set();
  
  private getDefaultViewState(): FlowViewState {
    return {
      zoom: 1,
      pan: { x: 0, y: 0 },
      animationSpeed: 1.5,
      showGrid: true,
      connectionStrokeWidth: 2,
    };
  }

  private async persistFlow(flow: FlowDefinition, notify: boolean): Promise<void> {
    if (this.api) {
      await this.api.flowSave({ flow });
    }
    if (notify) {
      this.notifySave();
    }
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
   * 订阅流程切换事件
   * @param callback 流程切换后的回调函数
   * @returns 取消订阅的函数
   */
  onFlowSwitch(callback: (flowId: string) => void): () => void {
    this.flowSwitchListeners.add(callback);
    return () => {
      this.flowSwitchListeners.delete(callback);
    };
  }

  /**
   * 触发流程切换事件
   */
  private notifyFlowSwitch(flowId: string): void {
    this.flowSwitchListeners.forEach(callback => callback(flowId));
  }

  // Helper to access API
  private get api() {
    return (window as any).electronAPI;
  }

  /**
   * 初始化存储系统
   */
  async init(): Promise<void> {
    try {
      await this.load();

      // 尝试恢复上次打开的流程
      if (this.data.selectedCategoryId && this.data.selectedFlowId) {
        const category = this.data.categories.find(c => c.id === this.data.selectedCategoryId);
        // 验证流程是否仍存在于该分类中
        if (category && category.flowIds.includes(this.data.selectedFlowId!)) {
          const flow = this.data.flows[this.data.selectedFlowId!];
          if (flow) {
            this.currentFlowId = this.data.selectedFlowId;
            console.log('已恢复上次打开的流程:', flow.name);
          }
        }
      }

      // 如果没有恢复成功，尝试使用分类中的第一个流程
      if (!this.currentFlowId && this.data.selectedCategoryId) {
        const category = this.data.categories.find(c => c.id === this.data.selectedCategoryId);
        if (category && category.flowIds.length > 0) {
          const flowId = category.flowIds[0];
          if (this.data.flows[flowId]) {
            this.currentFlowId = flowId;
            console.log('恢复分类第一个流程:', this.data.flows[flowId].name);
          }
        }
      }

      if (!this.data.categories.length) {
        await this.initializeDefaultCategory();
      }

      // 如果还是没有当前流程，尝试第一个分类的第一个流程
      if (!this.currentFlowId && this.data.categories.length > 0) {
        const firstCategory = this.data.categories[0];
        if (firstCategory.flowIds.length > 0) {
          const flowId = firstCategory.flowIds[0];
          if (this.data.flows[flowId]) {
            this.currentFlowId = flowId;
            this.data.selectedCategoryId = firstCategory.id;
            console.log('使用第一个分类的第一个流程:', this.data.flows[flowId].name);
          }
        }
      }

      console.log('流程存储系统初始化成功');
      console.log(`已加载 ${this.data.categories.length} 个分类, ${Object.keys(this.data.flows).length} 个流程`);
      console.log(`当前流程: ${this.currentFlowId ? this.data.flows[this.currentFlowId]?.name : '无'}`);
    } catch (error) {
      console.error('初始化存储系统失败:', error);
      // Fallback only if catastrophic failure, but avoid overwriting existing data if possible
      if (this.data.categories.length === 0) {
        await this.initializeDefaultCategory();
      }
    }
  }

  /**
   * 从文件系统加载数据
   */
  private async load(): Promise<void> {
    if (!this.api) {
      console.warn('Electron API不可用');
      return;
    }

    try {
      // 1. 加载分类结构
      const categoryData = await this.api.flowGetCategories();
      if (categoryData) {
        this.data.categories = categoryData.categories || [];
        this.data.selectedCategoryId = categoryData.selectedCategoryId || null;
        this.data.selectedFlowId = categoryData.selectedFlowId || null;  // 加载上次打开的流程ID
      }

      // 2. 加载所有流程文件
      const flows = await this.api.flowList();
      this.data.flows = {};
      if (Array.isArray(flows)) {
        for (const flow of flows) {
          this.data.flows[flow.id] = flow;
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      throw error;
    }
  }

  /**
   * 保存分类数据到文件系统
   */
  private async save(): Promise<void> {
    if (!this.api) return;

    const dataToSave = {
      categories: this.data.categories,
      selectedCategoryId: this.data.selectedCategoryId,
      selectedFlowId: this.currentFlowId,  // 保存当前流程ID
    };

    try {
      await this.api.flowSaveCategories(dataToSave);
      // 分类保存不一定需要通知 "Saved" 状态，主要用于流程内容保存
      // 但为了统一，也可以通知
      // this.notifySave(); 
    } catch (error) {
      console.error('保存分类数据失败:', error);
    }
  }

  /**
   * 初始化默认分类
   */
  private async initializeDefaultCategory(): Promise<void> {
    const defaultCategory: FlowCategory = {
      id: uuidv4(),
      name: '默认分类',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      flowIds: [],
    };
    this.data.categories = [defaultCategory];
    this.data.selectedCategoryId = defaultCategory.id;
    this.data.selectedFlowId = null;

    // 创建默认流程
    const defaultFlow = this.createEmptyFlow('新流程');
    this.data.flows[defaultFlow.id] = defaultFlow;
    defaultCategory.flowIds.push(defaultFlow.id);

    this.currentFlowId = defaultFlow.id;
    this.data.selectedFlowId = defaultFlow.id;  // 设置选中的流程ID

    // 保存流程文件
    if (this.api) {
      await this.api.flowSave({ flow: defaultFlow });
    }
    // 保存分类
    await this.save();
  }

  /**
   * 创建空流程
   */
  private createEmptyFlow(name: string): FlowDefinition {
    return {
      id: uuidv4(),
      name,
      description: '',
      version: '1.0.0',
      nodes: [],
      edges: [],
      settings: { ...defaultFlowSettings },
      metadata: { ...defaultFlowMetadata },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  // ==================== 分类管理方法 ====================

  getCategories(): FlowCategory[] {
    return this.data.categories;
  }

  getSelectedCategory(): FlowCategory | null {
    if (!this.data.selectedCategoryId) return null;
    return this.data.categories.find(c => c.id === this.data.selectedCategoryId) || null;
  }

  getSelectedCategoryId(): string | null {
    return this.data.selectedCategoryId;
  }

  async addCategory(name: string): Promise<FlowCategory> {
    const newCategory: FlowCategory = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      flowIds: [],
    };
    this.data.categories.push(newCategory);
    await this.save();
    return newCategory;
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const categoryIndex = this.data.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) return false;

    const category = this.data.categories[categoryIndex];

    // 删除该分类下的所有流程文件
    for (const flowId of category.flowIds) {
      if (this.api) {
        await this.api.flowDelete(flowId);
      }
      delete this.data.flows[flowId];
    }

    // 如果删除的是当前选中的分类，更新 selectedFlowId
    if (this.data.selectedCategoryId === categoryId) {
      this.data.selectedFlowId = null;
    }

    // 删除分类
    this.data.categories.splice(categoryIndex, 1);

    // 如果删除的是当前选中的分类，切换到其他分类
    if (this.data.selectedCategoryId === categoryId) {
      if (this.data.categories.length > 0) {
        await this.selectCategory(this.data.categories[0].id);
      } else {
        this.data.selectedCategoryId = null;
        this.currentFlowId = null;
      }
    }

    await this.save();
    return true;
  }

  async renameCategory(categoryId: string, name: string): Promise<boolean> {
    const category = this.data.categories.find(c => c.id === categoryId);
    if (!category) return false;

    category.name = name;
    category.updatedAt = Date.now();
    await this.save();
    return true;
  }

  async selectCategory(categoryId: string): Promise<boolean> {
    const category = this.data.categories.find(c => c.id === categoryId);
    if (!category) return false;

    this.data.selectedCategoryId = categoryId;

    // 加载该分类下上次打开的流程（如果有）
    if (this.data.selectedFlowId && category.flowIds.includes(this.data.selectedFlowId)) {
      this.currentFlowId = this.data.selectedFlowId;
      console.log('恢复该分类上次打开的流程:', this.data.flows[this.currentFlowId]?.name);
    }
    // 否则加载该分类的第一个流程
    else if (category.flowIds.length > 0) {
      this.currentFlowId = category.flowIds[0];
      this.data.selectedFlowId = this.currentFlowId;  // 同时更新记录的流程ID
      console.log('使用该分类第一个流程:', this.data.flows[this.currentFlowId]?.name);
    } else {
      // 分类为空，创建一个新的
      const newFlow = this.createEmptyFlow('新流程');
      this.data.flows[newFlow.id] = newFlow;
      category.flowIds.push(newFlow.id);
      this.currentFlowId = newFlow.id;
      this.data.selectedFlowId = newFlow.id;  // 设置选中的流程ID
      // Save new flow
      if (this.api) await this.api.flowSave({ flow: newFlow });
    }

    await this.save();
    return true;
  }

  // ==================== 流程管理方法 ====================

  async updateAiConfig(config: { selectedModelId: string; allowReadFlow: boolean; allowAiEdit: boolean; allowAiAutoExecution: boolean }): Promise<void> {
    if (!this.currentFlowId) return;
    const flow = this.data.flows[this.currentFlowId];
    if (flow) {
      flow.aiConfig = config;
      await this.persistFlow(flow, false);
    }
  }

  getCurrentFlow(): FlowDefinition | null {
    if (!this.currentFlowId) return null;
    return this.data.flows[this.currentFlowId] || null;
  }

  getCurrentFlowId(): string | null {
    return this.currentFlowId;
  }

  async createNewFlow(name: string = '新流程'): Promise<FlowDefinition> {
    const categoryId = this.data.selectedCategoryId;
    if (!categoryId) throw new Error('没有选中的分类');

    const newFlow = this.createEmptyFlow(name);
    this.data.flows[newFlow.id] = newFlow;

    const category = this.data.categories.find(c => c.id === categoryId);
    if (category) {
      category.flowIds.push(newFlow.id);
      category.updatedAt = Date.now();
    }

    // 切换到新创建的流程，并保存状态
    this.currentFlowId = newFlow.id;
    this.data.selectedFlowId = newFlow.id;

    // Save flow
    if (this.api) await this.api.flowSave({ flow: newFlow });

    // Save category (updated flowIds) and selectedFlowId
    await this.save();
    
    this.notifyFlowSwitch(newFlow.id);

    return newFlow;
  }

  async deleteFlow(flowId: string): Promise<boolean> {
    // Find category containing the flow
    const category = this.data.categories.find(c => c.flowIds.includes(flowId));
    if (!category) return false;

    // Remove from category
    category.flowIds = category.flowIds.filter(id => id !== flowId);
    category.updatedAt = Date.now();

    // Delete from file system
    if (this.api) await this.api.flowDelete(flowId);
    delete this.data.flows[flowId];

    // If deleted flow was the current one, switch to another
    if (this.currentFlowId === flowId) {
      if (category.flowIds.length > 0) {
        this.currentFlowId = category.flowIds[0];
        this.data.selectedFlowId = this.currentFlowId;
      } else {
        // Category is empty, check other categories or create new flow
        // For simplicity, create a new flow if category is empty
        const newFlow = this.createEmptyFlow('新流程');
        this.data.flows[newFlow.id] = newFlow;
        category.flowIds.push(newFlow.id);
        this.currentFlowId = newFlow.id;
        this.data.selectedFlowId = newFlow.id;
        if (this.api) await this.api.flowSave({ flow: newFlow });
      }
    }

    await this.save();
    return true;
  }

  async deleteCurrentFlow(): Promise<boolean> {
    if (!this.currentFlowId || !this.data.selectedCategoryId) return false;

    const category = this.data.categories.find(c => c.id === this.data.selectedCategoryId);
    if (!category) return false;

    const flowIdToDelete = this.currentFlowId;

    // 从分类中移除
    category.flowIds = category.flowIds.filter(id => id !== flowIdToDelete);

    // 从文件系统删除
    if (this.api) await this.api.flowDelete(flowIdToDelete);
    delete this.data.flows[flowIdToDelete];

    // 更新选中的流程ID
    if (category.flowIds.length > 0) {
      this.currentFlowId = category.flowIds[0];
      this.data.selectedFlowId = this.currentFlowId;
    } else {
      // 分类为空，创建新的
      const newFlow = this.createEmptyFlow('新流程');
      this.data.flows[newFlow.id] = newFlow;
      category.flowIds.push(newFlow.id);
      this.currentFlowId = newFlow.id;
      this.data.selectedFlowId = newFlow.id;
      if (this.api) await this.api.flowSave({ flow: newFlow });
    }

    await this.save();
    return true;
  }

  async switchFlow(flowId: string): Promise<boolean> {
    // 检查流程是否存在
    if (!this.data.flows[flowId]) return false;

    // 检查当前分类是否包含该流程
    const currentCategory = this.getSelectedCategory();
    if (!currentCategory || !currentCategory.flowIds.includes(flowId)) {
      // 尝试在其他分类中查找
      const targetCategory = this.data.categories.find(c => c.flowIds.includes(flowId));
      if (targetCategory) {
        this.data.selectedCategoryId = targetCategory.id;
      } else {
        // 流程存在但不在任何分类中（异常情况），暂时返回false
        console.warn(`Flow ${flowId} exists but belongs to no category`);
        return false;
      }
    }

    this.currentFlowId = flowId;
    // 保存当前流程ID，以便下次打开时恢复
    this.data.selectedFlowId = flowId;
    await this.save();
    
    this.notifyFlowSwitch(flowId);
    
    return true;
  }

  getFlowsInCategory(): FlowDefinition[] {
    const category = this.getSelectedCategory();
    if (!category) return [];
    return category.flowIds.map(id => this.data.flows[id]).filter(Boolean);
  }

  getAllFlows(): FlowDefinition[] {
    return Object.values(this.data.flows);
  }

  getFlowListItems(): FlowListItem[] {
    const flows = this.getFlowsInCategory();
    return flows.map(flow => ({
      id: flow.id,
      name: flow.name,
      description: flow.description,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
      nodeCount: flow.nodes.length,
      edgeCount: flow.edges.length,
    }));
  }

  // ==================== 流程数据操作方法 ====================

  async saveFlow(flow: FlowDefinition): Promise<FlowDefinition> {
    const savedFlow = {
      ...flow,
      id: flow.id || uuidv4(),
      updatedAt: Date.now(),
      createdAt: flow.createdAt || Date.now(),
    };

    this.data.flows[savedFlow.id] = savedFlow;

    await this.persistFlow(savedFlow, true);
    return savedFlow;
  }

  async getFlow(flowId: string): Promise<FlowDefinition | null> {
    return this.data.flows[flowId] || null;
  }

  async updateFlowNodes(flowId: string, nodes: FlowNode[]): Promise<void> {
    const flow = this.data.flows[flowId];
    if (flow) {
      flow.nodes = nodes;
      flow.updatedAt = Date.now();
      await this.persistFlow(flow, true);
    }
  }

  async updateFlowEdges(flowId: string, edges: FlowEdge[]): Promise<void> {
    const flow = this.data.flows[flowId];
    if (flow) {
      flow.edges = edges;
      flow.updatedAt = Date.now();
      await this.persistFlow(flow, true);
    }
  }

  async renameFlow(flowId: string, name: string): Promise<boolean> {
    const flow = this.data.flows[flowId];
    if (!flow) return false;

    flow.name = name;
    flow.updatedAt = Date.now();
    await this.persistFlow(flow, false);
    return true;
  }

  async updateTheme(flowId: string, theme: any): Promise<void> {
    const flow = this.data.flows[flowId];
    if (flow) {
      flow.theme = theme;
      flow.updatedAt = Date.now();
      await this.persistFlow(flow, true);
    }
  }

  // ==================== 视图状态管理方法 ====================

  /**
   * 保存流程视图状态（缩放、平移、动画速度等）
   */
  async saveViewState(flowId: string, viewState: FlowViewState): Promise<void> {
    const flow = this.data.flows[flowId];
    if (!flow) return;

    flow.viewState = viewState;
    flow.updatedAt = Date.now();
    await this.persistFlow(flow, true);
  }

  /**
   * 获取流程视图状态
   */
  getViewState(flowId: string): FlowViewState | null {
    const flow = this.data.flows[flowId];
    if (!flow || !flow.viewState) return null;
    return flow.viewState;
  }

  /**
   * 获取当前流程视图状态
   */
  getCurrentViewState(): FlowViewState | null {
    if (!this.currentFlowId) return null;
    return this.getViewState(this.currentFlowId);
  }

  /**
   * 更新当前流程视图状态
   */
  async updateCurrentViewState(viewState: Partial<FlowViewState>): Promise<void> {
    if (!this.currentFlowId) return;

    const flow = this.data.flows[this.currentFlowId];
    if (!flow) return;

    const currentViewState = flow.viewState || this.getDefaultViewState();

    flow.viewState = { ...currentViewState, ...viewState };
    flow.updatedAt = Date.now();

    await this.persistFlow(flow, false);
  }

  async updateFlowMetadata(flowId: string, metadata: Partial<FlowMetadata>): Promise<void> {
    const flow = this.data.flows[flowId];
    if (flow) {
      flow.metadata = { ...flow.metadata, ...metadata };
      flow.updatedAt = Date.now();
      await this.persistFlow(flow, false);
    }
  }

  async updateFlowSettings(flowId: string, settings: Partial<FlowSettings>): Promise<void> {
    const flow = this.data.flows[flowId];
    if (flow) {
      flow.settings = { ...flow.settings, ...settings };
      flow.updatedAt = Date.now();
      await this.persistFlow(flow, false);
    }
  }

  // ==================== 导入导出方法 ====================

  exportFlow(flowId: string): string {
    const flow = this.data.flows[flowId];
    if (!flow) return '{}';
    return JSON.stringify(flow, null, 2);
  }

  async importFlow(data: string, name?: string): Promise<FlowDefinition> {
    const categoryId = this.data.selectedCategoryId;
    if (!categoryId) throw new Error('没有选中的分类');

    const parsed = JSON.parse(data) as FlowDefinition;

    if (!parsed.id || !parsed.nodes) {
      throw new Error('无效的数据格式');
    }

    // 创建新的流程，保留数据但使用新的ID
    const newFlow: FlowDefinition = {
      ...parsed,
      id: uuidv4(),
      name: name || parsed.name || '导入的流程',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.data.flows[newFlow.id] = newFlow;

    const category = this.data.categories.find(c => c.id === categoryId);
    if (category) {
      category.flowIds.push(newFlow.id);
      category.updatedAt = Date.now();
    }

    // 切换到新导入的流程，并保存状态
    this.currentFlowId = newFlow.id;
    this.data.selectedFlowId = newFlow.id;

    // Save new flow
    if (this.api) await this.api.flowSave({ flow: newFlow });
    // Save category and selectedFlowId
    await this.save();

    return newFlow;
  }

  // ==================== 统计方法 ====================

  getTotalFlowCount(): number {
    return Object.keys(this.data.flows).length;
  }

  getTotalCategoryCount(): number {
    return this.data.categories.length;
  }
}

export const flowStorage = new FlowStorageService();
