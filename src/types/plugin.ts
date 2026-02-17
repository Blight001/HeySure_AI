/**
 * HeySure AI - 插件类型定义
 * 定义插件系统相关的数据结构：
 * - Plugin: 插件主体
 * - PluginCategory: 插件分类（聊天/嵌入/语音合成/语音识别/工具）
 * - PluginCapability: 插件能力
 * - PluginSettingDefinition: 插件设置定义
 * - PluginConfig: 插件配置
 * - PluginManifest: 插件清单
 * - PluginStatus: 插件状态
 */
// ============ 插件类型 ============
export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon: string;
  category: PluginCategory;
  capabilities: PluginCapability[];
  settings: PluginSettingDefinition[];
  config: PluginConfig;
  manifest: PluginManifest;
  status: PluginStatus;
  installedAt: number;
  enabled: boolean;
}

export type PluginCategory = 'chat' | 'embedding' | 'tts' | 'stt' | 'tool';

export type PluginCapability = 'chat' | 'stream' | 'function_call' | 'vision';

export type PluginStatus = 'idle' | 'loading' | 'ready' | 'error' | 'updating';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon: string;
  category: PluginCategory;
  capabilities: PluginCapability[];
  entry: string;
  permissions: string[];
  settings?: PluginSettingDefinition[];
  supportedModels: ModelInfo[];
}

export interface PluginConfig {
  apiKey?: string;
  baseUrl?: string;
  enabledModels?: string[];
  customSettings?: Record<string, any>;
}

export interface PluginSettingDefinition {
  key: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'textarea';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  placeholder?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  maxOutput: number;
  streaming: boolean;
  vision: boolean;
  functionCall: boolean;
  pricing?: {
    input: number;
    output: number;
  };
}

export interface PluginHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  lastCheckAt: number;
}

