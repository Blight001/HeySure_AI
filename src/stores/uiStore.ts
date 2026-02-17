/**
 * HeySure AI - UI 状态管理 Store
 * 使用 Zustand 管理 UI 相关的状态，包括：
 * - 侧边栏状态（展开/折叠、宽度）
 * - 对话面板状态（宽度、显示/隐藏）
 * - 模态框管理
 * - 面板可见性（设置面板、快捷键面板）
 * - 全局加载状态
 * - 对话模式切换（普通对话/思维导图/操作流程）
 */
import { create } from 'zustand';

interface UiState {
  // 侧边栏
  sidebarCollapsed: boolean;
  sidebarWidth: number;

  // 对话面板
  chatPanelWidth: number;
  showChatPanel: boolean;

  // 模态框
  activeModal: string | null;
  modalData: Record<string, any>;

  // 面板可见性
  showSettingsPanel: boolean;
  showShortcutsPanel: boolean;

  // 加载状态
  globalLoading: boolean;
  loadingMessage: string;

  // 对话模式
  chatMode: 'default' | 'mindmap' | 'flow';
  setChatMode: (mode: 'default' | 'mindmap' | 'flow') => void;

  // Actions - 侧边栏
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarWidth: (width: number) => void;

  // Actions - 对话面板
  setChatPanelWidth: (width: number) => void;
  setShowChatPanel: (show: boolean) => void;

  // Actions - 模态框
  openModal: (modalId: string, data?: Record<string, any>) => void;
  closeModal: () => void;

  // Actions - 面板可见性
  setShowSettingsPanel: (show: boolean) => void;
  setShowShortcutsPanel: (show: boolean) => void;

  // Actions - 加载状态
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Actions - 其他
  reset: () => void;
}

const initialState = {
  sidebarCollapsed: false,
  sidebarWidth: 280,
  chatPanelWidth: 360,
  showChatPanel: true,
  activeModal: null,
  modalData: {},
  showSettingsPanel: false,
  showShortcutsPanel: false,
  globalLoading: false,
  loadingMessage: '',
  chatMode: 'default' as 'default' | 'mindmap' | 'flow',
};

export const useUiStore = create<UiState>()((set, get) => ({
  ...initialState,

  setChatMode: (mode) => set({ chatMode: mode }),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarWidth: (width) =>
    set({ sidebarWidth: Math.max(200, Math.min(500, width)) }),

  setChatPanelWidth: (width) =>
    set({ chatPanelWidth: Math.max(280, Math.min(500, width)) }),

  setShowChatPanel: (show) => set({ showChatPanel: show }),

  openModal: (modalId, data = {}) =>
    set({ activeModal: modalId, modalData: data }),

  closeModal: () => set({ activeModal: null, modalData: {} }),

  setShowSettingsPanel: (show) => set({ showSettingsPanel: show }),

  setShowShortcutsPanel: (show) => set({ showShortcutsPanel: show }),

  setGlobalLoading: (loading, message = '') =>
    set({ globalLoading: loading, loadingMessage: message }),

  reset: () => set(initialState),
}));
