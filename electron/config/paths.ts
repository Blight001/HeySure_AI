/**
 * 统一路径配置
 * 所有项目中的存储路径都在此文件中定义和管理
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { existsSync, promises as fs } from 'fs';

// ========== 基础路径计算 ==========

// 获取当前文件的路径
const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);

// 项目根目录：优先使用 process.cwd() (开发环境)，或者是相对于当前文件的路径
let projectRoot = join(currentDir, '..', '..');

// 检查计算出的路径是否包含 package.json
if (!existsSync(join(projectRoot, 'package.json'))) {
  // 如果当前计算的路径下没有 package.json
  // 1. 尝试 process.cwd()
  if (existsSync(join(process.cwd(), 'package.json'))) {
    projectRoot = process.cwd();
  }
  // 2. 如果在 dist/out/build 目录中，向上查找
  else if (projectRoot.endsWith('dist') || projectRoot.endsWith('out') || projectRoot.endsWith('build')) {
    projectRoot = join(projectRoot, '..');
  }
}

const PROJECT_ROOT = projectRoot;
console.log('[Paths] Project Root:', PROJECT_ROOT);

// 用户数据目录（操作系统应用数据目录）
const APPDATA_DIR = process.env.APPDATA || '';
console.log('[Paths] AppData Dir:', APPDATA_DIR);

// ========== 主数据目录配置 ==========

/**
 * 主数据目录
 * 默认使用项目根目录下的 data 文件夹
 * 可以通过环境变量 HEYSURE_DATA_DIR 覆盖
 */
export const DATA_DIR = process.env.HEYSURE_DATA_DIR
  ? process.env.HEYSURE_DATA_DIR
  : join(PROJECT_ROOT, 'data');
console.log('[Paths] Data Dir:', DATA_DIR);



// ========== 目录创建辅助函数 ==========

/**
 * 确保数据目录存在
 */
export async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}



// ========== 数据文件路径 ==========

// 对话数据文件
export const DIALOGS_FILE = join(DATA_DIR, 'dialogs.json');

// 消息数据文件
export const MESSAGES_FILE = join(DATA_DIR, 'messages.json');

// 模型配置文件
export const MODELS_FILE = join(DATA_DIR, 'models.json');

// ========== 思维导图目录 ==========

// 思维导图数据目录
export const MINDMAP_DIR = join(DATA_DIR, 'mindmap');

// 思维导图数据文件
export const MINDMAPS_FILE = join(MINDMAP_DIR, 'mindmaps.json');

// 思维导图文件前缀
export const MINDMAP_FILE_PREFIX = 'map_';
export const getMindmapFile = (mapId: string) =>
  join(MINDMAP_DIR, `${MINDMAP_FILE_PREFIX}${mapId}.json`);

// 兼容旧函数名
export const getMindmapNodeFile = getMindmapFile;

// 思维导图脚本文件目录
export const MINDMAP_SCRIPT_DIR = join(DATA_DIR, 'script');

// ========== Python 脚本路径 ==========

// Python 脚本主目录
export const PYTHON_SCRIPT_DIR = join(DATA_DIR, 'script');

// Python 模式脚本目录
export const PYTHON_MODE_DIR = join(PYTHON_SCRIPT_DIR, 'mode');

// Python 主脚本文件
export const PYTHON_MAIN_FILE = join(PYTHON_SCRIPT_DIR, 'main.py');

// ========== 设置文件路径 ==========

// 用户设置文件
export const SETTINGS_FILE = join(DATA_DIR, 'settings.json');

// ========== 流程文件路径 ==========

// 流程文件目录
export const FLOW_DIR = join(DATA_DIR, 'flows');

// 流程文件前缀
export const FLOW_FILE_PREFIX = 'flow_';
export const getFlowFile = (flowId: string) =>
  join(FLOW_DIR, `${FLOW_FILE_PREFIX}${flowId}.json`);

// 流程分类文件
export const FLOW_CATEGORIES_FILE = join(FLOW_DIR, 'categories.json');

// ========== 类型定义 ==========

/**
 * 对话数据结构（独立存储时使用，保留向后兼容）
 */
export interface Dialog {
  id: string;
  title: string;
  type: 'single' | 'group' | 'debate' | 'flow';
  flowId?: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

/**
 * 对话消息结构
 */
export interface DialogMessage {
  id: string;
  dialogId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * 对话存储结构（整合到 messages.json）
 * messages.json 文件中每个对话的存储格式
 */
export interface DialogStorage {
  id: string;
  title: string;
  type: 'single' | 'group' | 'debate' | 'flow';
  flowId?: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  messages: DialogMessage[];
}

/**
 * 思维导图数据结构
 */
export interface MindmapData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes: any[];
  version: number;
  layoutType?: string;
}

/**
 * 思维导图分类
 */
export interface MindmapCategory {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  mapIds: string[];
}

/**
 * 分类存储数据
 */
export interface CategoryStorageData {
  categories: MindmapCategory[];
  selectedCategoryId: string | null;
  maps: Record<string, MindmapData>;
}

/**
 * 模型配置结构
 */
export interface ModelConfig {
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
  createdAt: string;
  updatedAt: string;
}

/**
 * 设置数据结构
 */
export interface SettingsType {
  theme: string;
  language: string;
  fontSize: number;
  autoSave: boolean;
  autoSaveInterval: number;
  showConsole: boolean;
  maxHistoryCount: number;
  enableSpellCheck: boolean;
  enableMarkdownPreview: boolean;
  enableCodeHighlight: boolean;
  enableSound: boolean;
  notificationOnComplete: boolean;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  shortcuts: Record<string, string>;
}

/**
 * 所有可用的数据存储类型
 */
export type StorageType =
  | 'dialogs'      // 对话
  | 'messages'     // 消息
  | 'models'       // 模型配置
  | 'mindmaps'     // 思维导图
  | 'mindmapNodes' // 思维导图节点
  | 'settings';    // 用户设置

/**
 * 获取存储路径的便捷函数
 */
export function getStoragePath(type: StorageType, id?: string): string {
  switch (type) {
    case 'dialogs':
      return DIALOGS_FILE;
    case 'messages':
      return MESSAGES_FILE;
    case 'models':
      return MODELS_FILE;
    case 'mindmaps':
      return MINDMAPS_FILE;
    case 'mindmapNodes':
      return id ? getMindmapNodeFile(id) : '';
    case 'settings':
      return SETTINGS_FILE;
    default:
      return '';
  }
}

// ========== 导出项目根路径 ==========

export { PROJECT_ROOT };

