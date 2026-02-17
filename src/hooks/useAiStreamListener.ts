/**
 * HeySure AI - AI 流式响应监听 Hook
 * 负责监听 AI 流式响应事件，更新消息状态
 * 处理消息缓冲区以避免频繁更新 store
 */
import { useState, useEffect, useRef } from 'react';
import { useMessageStore } from '@/stores';

/**
 * Hook to handle AI streaming listeners and message updates
 * @param dialogId Current dialog ID to filter messages
 * @returns Object containing isWaitingForAI state and setter
 */
export function useAiStreamListener(dialogId: string | undefined) {
  // Whether waiting for the first chunk of AI response
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  
  // Buffer for streaming content to avoid too frequent store updates
  const streamBufferRef = useRef<{ [key: string]: string }>({});
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogIdRef = useRef<string | undefined>(dialogId);

  // Update ref when dialogId changes
  useEffect(() => {
    dialogIdRef.current = dialogId;
    
    // Clear buffer and timeout when switching dialogs
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
    streamBufferRef.current = {};
    
    // Reset waiting state when dialog changes
    setIsWaitingForAI(false);
  }, [dialogId]);

  // Flush buffered content to the store
  const flushStreamBuffer = () => {
    // Clear timeout reference
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }

    const buffer = streamBufferRef.current;
    if (Object.keys(buffer).length === 0) return;

    const state = useMessageStore.getState();

    Object.entries(buffer).forEach(([msgId, content]) => {
      if (!content) return;

      const existingMsg = state.messages.find(m => m.id === msgId);
      if (existingMsg) {
        state.appendToMessage(msgId, content);
      }
    });

    // Clear buffer
    streamBufferRef.current = {};
  };

  // Setup streaming listener
  useEffect(() => {
    const handleAiStream = (_: any, data: any) => {
      const { dialogId: msgDialogId, messageId, content, done } = data;

      // Only handle messages for the current dialog
      if (msgDialogId !== dialogIdRef.current) return;

      // Hide loading animation when content is received
      if (!done && content) {
        setIsWaitingForAI(false);
      }

      const state = useMessageStore.getState();
      const existingMsg = state.messages.find(m => m.id === messageId);

      // If message doesn't exist yet, add it
      if (!existingMsg) {
        if (!done && content) {
          flushStreamBuffer();

          state.addMessage({
            id: messageId,
            dialogId: msgDialogId,
            role: 'assistant',
            content: content,
            timestamp: Date.now(),
            metadata: { streamed: true }
          });
        }
        return;
      }

      // If message exists, buffer updates
      if (!done && content) {
        streamBufferRef.current[messageId] = (streamBufferRef.current[messageId] || '') + content;

        if (!streamTimeoutRef.current) {
          streamTimeoutRef.current = setTimeout(() => {
            flushStreamBuffer();
          }, 50);
        }
      } else if (done) {
        flushStreamBuffer();
      }
    };

    if (window.electronAPI?.onAiStream) {
      // Remove old listeners to prevent duplicates
      if (window.electronAPI.removeAllAiStreamListeners) {
        window.electronAPI.removeAllAiStreamListeners();
      }
      window.electronAPI.onAiStream(handleAiStream);
    }

    return () => {
      if (window.electronAPI?.removeAllAiStreamListeners) {
        window.electronAPI.removeAllAiStreamListeners();
      } else if (window.electronAPI?.offAiStream) {
        window.electronAPI.offAiStream(handleAiStream);
      }
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
    };
  }, []);

  return {
    isWaitingForAI,
    setIsWaitingForAI
  };
}
