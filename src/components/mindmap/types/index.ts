export interface MindmapNode {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  lastUsed: string;
  contexts: string[];
  children: string[];
  x?: number;
  y?: number;
  isRoot?: boolean;
  type?: string;            // 节点类型
  // 新增属性
  color?: string;           // 节点颜色
  collapsed?: boolean;      // 是否折叠
  note?: string;            // 备注信息
  icon?: string;            // 图标
  fontSize?: number;        // 字体大小
  fontWeight?: 'normal' | 'medium' | 'bold';  // 字体粗细
  duplicateIndex?: number; // 重复节点序号（当存在相同名称时显示）
}

import { ThemeConfig } from '@/types/theme';

export type MindmapThemeConfig = ThemeConfig;

// 布局类型
export type LayoutType = 'tree-right' | 'tree-left' | 'tree-top' | 'tree-bottom' | 'radial' | 'fishbone';

// 布局配置
export interface LayoutConfig {
  type: LayoutType;
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  rootX?: number;
  rootY?: number;
  nodeHeights?: Record<string, number>; // 自定义节点高度映射
}

export interface MindmapData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes: MindmapNode[];
  version: number;
  layoutType?: LayoutType;  // 布局类型
  theme?: MindmapThemeConfig;  // 主题配置
  viewState?: {
    scale: number;
    x: number;
    y: number;
  };
  aiConfig?: {
    selectedModelId: string;
    allowReadMindmap: boolean;
    allowAiEdit: boolean;
  };
}

// 文件分类接口
export interface FileCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  mapIds: string[];  // 属于该分类的思维导图ID列表
}

// 分类存储数据
export interface CategoryStorageData {
  categories: FileCategory[];
  selectedCategoryId: string | null;
  selectedMapId?: string | null; // 当前选中的思维导图ID
  maps: Record<string, MindmapData>;  // 所有思维导图数据
}

export interface LocalModelConfig {
  id: string;
  name: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  enableMultiTurn: boolean;
  enableStreaming: boolean;
  enableThinking: boolean;
  enableWebSearch: boolean;
  enableWebScraping: boolean;
  enabled: boolean;
}

export type MindmapUpdateAction = {
  type: 'rename' | 'add' | 'delete' | 'move' | 'swap' | 'promote' | 'demote';
  nodeId?: string;
  parentId?: string; // for add/move
  newParentId?: string; // alias for move
  name?: string; // for add/rename
  withNodeId?: string; // for swap
  direction?: 'up' | 'down'; // for swap
  index?: number; // insert position for move
};

export interface PendingChange {
  id: string;
  action: MindmapUpdateAction;
  status: 'pending' | 'accepted' | 'rejected';
  description?: string;
}

export type HistoryActionType = 'add' | 'delete' | 'update' | 'move' | 'collapse' | 'color' | 'clear' | 'theme' | 'reparent' | 'reorder';

export interface HistoryEntry {
  id: string;
  type: HistoryActionType;
  timestamp: string;
  data: {
    nodeId?: string;
    parentId?: string;
    beforeParentId?: string;
    afterParentId?: string;
    withNodeId?: string;
    before?: MindmapNode | MindmapData;
    after?: MindmapNode | MindmapData;
    nodes?: MindmapNode[];
  };
  description: string;
}
