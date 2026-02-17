/**
 * HeySure AI - 应用设置状态管理 Store
 * 使用 Zustand 管理应用设置，支持持久化存储，包括：
 * - API 提供商配置
 * - 对话参数设置（默认模型、Token 限制、温度等）
 * - UI 设置（主题、语言、字体大小）
 * - 高级设置（流式输出、快捷键、自动保存等）
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ApiProvider {
  id: string;
  name: string;
  apiBaseUrl: string;
  apiKey?: string;
  modelId: string;
  enabled: boolean;
}

export interface SettingsState {
  // API 设置
  apiProviders: ApiProvider[];
  selectedProviderId: string | null;
  globalApiKey: string;
  globalApiBaseUrl: string;

  // 对话设置
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;

  // UI 设置
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontSize: number;

  // 高级设置
  enableStreaming: boolean;
  enableShortcuts: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  showConsole: boolean;

  // Actions - API 设置
  addApiProvider: (provider: ApiProvider) => void;
  updateApiProvider: (id: string, updates: Partial<ApiProvider>) => void;
  removeApiProvider: (id: string) => void;
  setSelectedProvider: (id: string | null) => void;
  setGlobalApiKey: (key: string) => void;
  setGlobalApiBaseUrl: (url: string) => void;

  // Actions - 对话设置
  setDefaultModel: (model: string) => void;
  setMaxTokens: (tokens: number) => void;
  setTemperature: (temp: number) => void;
  setSystemPrompt: (prompt: string) => void;

  // Actions - UI 设置
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (lang: string) => void;
  setFontSize: (size: number) => void;

  // Actions - 高级设置
  setEnableStreaming: (enabled: boolean) => void;
  setEnableShortcuts: (enabled: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setShowConsole: (show: boolean) => void;

  // 持久化
  reset: () => void;
}

// 只包含数据属性的类型（不含 Actions 方法）
type SettingsData = Omit<SettingsState,
  'addApiProvider' | 'updateApiProvider' | 'removeApiProvider' | 'setSelectedProvider' |
  'setGlobalApiKey' | 'setGlobalApiBaseUrl' | 'setDefaultModel' | 'setMaxTokens' |
  'setTemperature' | 'setSystemPrompt' | 'setTheme' | 'setLanguage' | 'setFontSize' |
  'setEnableStreaming' | 'setEnableShortcuts' | 'setAutoSave' | 'setAutoSaveInterval' |
  'setShowConsole' | 'reset'
>;

const defaultSettings: SettingsData = {
  apiProviders: [],
  selectedProviderId: null,
  globalApiKey: '',
  globalApiBaseUrl: 'https://api.openai.com/v1',
  defaultModel: 'gpt-3.5-turbo',
  maxTokens: 4096,
  temperature: 0.7,
  systemPrompt: '你是一个有用的 AI 助手。',
  theme: 'dark',
  language: 'zh-CN',
  fontSize: 14,
  enableStreaming: true,
  enableShortcuts: true,
  autoSave: true,
  autoSaveInterval: 30,
  showConsole: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      addApiProvider: (provider) =>
        set((state) => ({
          apiProviders: [...state.apiProviders, provider],
        })),

      updateApiProvider: (id, updates) =>
        set((state) => ({
          apiProviders: state.apiProviders.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      removeApiProvider: (id) =>
        set((state) => ({
          apiProviders: state.apiProviders.filter((p) => p.id !== id),
          selectedProviderId:
            state.selectedProviderId === id ? null : state.selectedProviderId,
        })),

      setSelectedProvider: (id) => set({ selectedProviderId: id }),

      setGlobalApiKey: (key) => set({ globalApiKey: key }),

      setGlobalApiBaseUrl: (url) => set({ globalApiBaseUrl: url }),

      setDefaultModel: (model) => set({ defaultModel: model }),

      setMaxTokens: (tokens) => set({ maxTokens: tokens }),

      setTemperature: (temp) => set({ temperature: temp }),

      setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

      setTheme: (theme) => set({ theme }),

      setLanguage: (lang) => set({ language: lang }),

      setFontSize: (size) => set({ fontSize: size }),

      setEnableStreaming: (enabled) => set({ enableStreaming: enabled }),

      setEnableShortcuts: (enabled) => set({ enableShortcuts: enabled }),

      setAutoSave: (enabled) => set({ autoSave: enabled }),

      setAutoSaveInterval: (interval) => set({ autoSaveInterval: interval }),

      setShowConsole: (show) => set({ showConsole: show }),

      reset: () => set(defaultSettings),
    }),
    {
      name: 'heysure-settings',
    }
  )
);
