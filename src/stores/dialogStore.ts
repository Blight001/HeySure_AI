/**
 * HeySure AI - 对话状态管理 Store
 * 使用 Zustand 管理对话列表状态，包括：
 * - 对话列表管理（添加、更新、删除）
 * - 当前选中对话管理
 * - 加载状态和错误状态
 * - 空对话检测功能
 */
import { create } from 'zustand';
import type { Dialog } from '@/types';

interface DialogState {
  dialogs: Dialog[];
  currentDialogId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setDialogs: (dialogs: Dialog[]) => void;
  addDialog: (dialog: Dialog) => void;
  updateDialog: (id: string, updates: Partial<Dialog>) => void;
  removeDialog: (id: string) => void;
  setCurrentDialog: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  // 检查对话是否为新建的空对话（标题为"新对话"且没有用户消息）
  isNewEmptyDialog: (dialogId: string, hasUserMessage: boolean) => boolean;
}

const initialState = {
  dialogs: [],
  currentDialogId: null,
  isLoading: false,
  error: null,
};

export const useDialogStore = create<DialogState>()((set, get) => ({
  ...initialState,

  setDialogs: (dialogs) => set({ dialogs }),

  addDialog: (dialog) =>
    set((state) => ({
      dialogs: [dialog, ...(Array.isArray(state.dialogs) ? state.dialogs : [])],
    })),

  updateDialog: (id, updates) =>
    set((state) => ({
      dialogs: state.dialogs.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),

  removeDialog: (id) =>
    set((state) => ({
      dialogs: Array.isArray(state.dialogs) ? state.dialogs.filter((d) => d.id !== id) : [],
      // 只有当删除的是当前对话时，才清空 currentDialogId
      currentDialogId: state.currentDialogId === id ? null : state.currentDialogId,
    })),

  setCurrentDialog: (id) => set({ currentDialogId: id }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),

  isNewEmptyDialog: (dialogId: string, hasUserMessage: boolean) => {
    const state = get();
    const dialog = state.dialogs.find((d) => d.id === dialogId);
    if (!dialog) return false;

    // 检查是否为新对话（标题为"新对话"或空标题）
    const isNewDialog = dialog.title === '新对话' || dialog.title === '';

    // 如果不是新对话，或者已经有用户消息，则不是空对话
    return isNewDialog && !hasUserMessage;
  },
}));
