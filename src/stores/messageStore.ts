/**
 * HeySure AI - 消息状态管理 Store
 * 使用 Zustand 管理聊天消息状态，包括：
 * - 消息列表管理（添加、更新、删除、清除）
 * - 加载状态和流式响应状态
 * - 错误状态管理
 * - Token 使用统计计算
 */
import { create } from 'zustand';
import type { Message, MessageRole, TokenUsage } from '@/types';

interface MessageState {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  currentStreamingId: string | null;
  error: string | null;

  // Actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean, id?: string | null) => void;
  appendToMessage: (id: string, content: string, tokenUsage?: TokenUsage, sequence?: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  getDialogTokenStats: (dialogId: string) => {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    messageCount: number;
    modelIds: string[];
  };
}

const initialState = {
  messages: [],
  isLoading: false,
  isStreaming: false,
  currentStreamingId: null,
  error: null,
};

export const useMessageStore = create<MessageState>()((set, get) => ({
  ...initialState,

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => {
      // 防止重复添加相同ID的消息
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: [...state.messages, message],
      };
    }),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),

  clearMessages: () => set({ messages: [] }),

  setLoading: (loading) => set({ isLoading: loading }),

  setStreaming: (streaming, id = null) =>
    set({
      isStreaming: streaming,
      currentStreamingId: id,
    }),

  appendToMessage: (id, content, tokenUsage, sequence) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== id) return m;

        // 如果提供了序列号，且当前消息已处理过该序列号（或更大），则忽略
        if (sequence !== undefined && m.metadata?.lastSequence !== undefined && sequence <= m.metadata.lastSequence) {
          return m;
        }

        return {
          ...m,
          content: m.content + content,
          metadata: {
            ...m.metadata,
            tokenUsage: tokenUsage || m.metadata.tokenUsage,
            lastSequence: sequence !== undefined ? sequence : m.metadata.lastSequence,
          },
        };
      }),
    })),

  setError: (error) => set({ error }),

  reset: () => set(initialState),

  getDialogTokenStats: (dialogId) => {
    const state = get();
    const dialogMessages = state.messages.filter((m) => m.dialogId === dialogId);

    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    const modelIds: string[] = [];

    dialogMessages.forEach((msg) => {
      if (msg.metadata?.tokenUsage) {
        totalTokens += msg.metadata.tokenUsage.totalTokens;
        promptTokens += msg.metadata.tokenUsage.promptTokens;
        completionTokens += msg.metadata.tokenUsage.completionTokens;
      }
      if (msg.metadata?.modelId && !modelIds.includes(msg.metadata.modelId)) {
        modelIds.push(msg.metadata.modelId);
      }
    });

    return {
      totalTokens,
      promptTokens,
      completionTokens,
      messageCount: dialogMessages.length,
      modelIds,
    };
  },
}));

// 选择器
export const useMessagesByDialog = (dialogId: string) => {
  const messages = useMessageStore((state) => state.messages);
  return messages.filter((m) => m.dialogId === dialogId);
};

export const useLatestMessage = () => {
  const messages = useMessageStore((state) => state.messages);
  return messages[messages.length - 1];
};

