/**
 * HeySure AI - AI 对话 Hook
 * 提供发送消息、加载状态、错误处理等功能
 * 封装与 AI 对话相关的常见操作
 */
import { useCallback, useRef, useState } from 'react';
import { useMessageStore } from '@/stores';
import { MessageService } from '@/services/apiService';
import type { Message } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface UseAIChatOptions {
  dialogId: string;
  onMessage?: (message: Message) => void;
  onComplete?: (messages: Message[]) => void;
  onError?: (error: Error) => void;
}

interface UseAIChatReturn {
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useAIChat({
  dialogId,
  onMessage,
  onComplete,
  onError,
}: UseAIChatOptions): UseAIChatReturn {
  const { messages, addMessage, setLoading, setError } = useMessageStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setLoading(true);
      setError(null);

      try {
        // 发送消息并获取响应
        const response = await MessageService.send(dialogId, content);

        // 添加所有消息到 store
        response.forEach((msg: Message) => {
          addMessage(msg);
          onMessage?.(msg);
        });

        onComplete?.(response);
      } catch (error: any) {
        const err = new Error(error.message || '发送消息失败');
        setError(err.message);
        onError?.(err);
      } finally {
        setLoading(false);
      }
    },
    [dialogId, addMessage, setLoading, setError, onMessage, onComplete, onError]
  );

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const { isLoading, error } = useMessageStore();

  return {
    sendMessage,
    isLoading,
    error,
  };
}
