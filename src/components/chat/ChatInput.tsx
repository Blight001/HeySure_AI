/**
 * HeySure AI - 聊天输入组件
 * 负责聊天消息的输入和发送，包括：
 * - 文本输入框（支持自动调整高度）
 * - 发送/停止按钮
 * - 快捷键支持（Enter 发送，Shift+Enter 换行）
 * - Token 使用统计显示
 * - 附件/图片/麦克风按钮（预留）
 */
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, StopCircle, Image, Paperclip, Mic, Coins } from 'lucide-react';
import { useMessageStore } from '@/stores';

interface ChatInputProps {
  dialogId: string;
  disabled?: boolean;
  placeholder?: string;
  onSend: (content: string, modelId?: string) => void;
  onStop?: () => void;
  selectedModelId?: string;
  modelName?: string;
}

export function ChatInput({
  dialogId,
  disabled = false,
  placeholder = '输入消息...',
  onSend,
  onStop,
  selectedModelId,
  modelName,
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isLoading, isStreaming, messages } = useMessageStore();

  const handleSend = useCallback(() => {
    if (!content.trim() || disabled || isLoading || isStreaming || isSending) return;
    setIsSending(true);
    onSend(content.trim(), selectedModelId);
    setContent('');
    textareaRef.current?.focus();
    // 短暂延迟后重置发送状态，防止快速重复点击
    setTimeout(() => setIsSending(false), 500);
  }, [content, disabled, isLoading, isStreaming, isSending, onSend, selectedModelId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, isComposing]
  );

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  // 计算当前对话的Token统计
  const tokenStats = useMemo(() => {
    if (!dialogId) return { totalTokens: 0, promptTokens: 0, completionTokens: 0 };
    return useMessageStore.getState().getDialogTokenStats(dialogId);
  }, [dialogId, messages]);

  return (
    <Card className="p-4">
      <div className="flex items-end gap-2">
        {/* 输入框 */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[44px] max-h-[200px] resize-none pr-20"
            rows={1}
          />

          {/* 操作按钮 */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled
            >
              <Image className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 发送/停止按钮 */}
        {(isLoading || isStreaming) ? (
          <Button
            size="icon"
            className="h-[44px] w-[44px]"
            onClick={onStop}
            variant="destructive"
          >
            <StopCircle className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-[44px] w-[44px]"
            onClick={handleSend}
            disabled={!content.trim() || disabled}
          >
            <Send className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* 快捷键提示 */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Enter 发送</span>
          <span>Shift + Enter 换行</span>
        </div>
        <div className="flex items-center gap-3">
          {tokenStats.totalTokens > 0 && (
            <div className="flex items-center gap-1 cursor-help" title={`输入: ${tokenStats.promptTokens.toLocaleString()}\n输出: ${tokenStats.completionTokens.toLocaleString()}\n总计: ${tokenStats.totalTokens.toLocaleString()}`}>
              <Coins className="h-3 w-3" />
              <span>{tokenStats.totalTokens.toLocaleString()} tokens</span>
            </div>
          )}
          {selectedModelId && (
            <div className="flex items-center gap-1">
              <span>使用 {modelName}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
