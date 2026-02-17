/**
 * HeySure AI - 思维导图 AI 对话浮窗组件
 * 提供思维导图模式下的 AI 辅助功能，包括：
 * - 消息输入和发送
 * - Markdown 内容渲染
 * - 对话历史展示
 * - Token 使用统计
 * - 流式响应显示
 * - 与主聊天界面的消息同步
 */
import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { X, Send, Bot, User, Loader2, History, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { v4 as uuidv4 } from 'uuid';
import { chatBridge } from '@/services/chatBridge';

import ReactMarkdown from 'react-markdown';

// 消息类型
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  fullContent?: string;
}

// 模型配置类型
interface ModelConfig {
  id: string;
  name: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface MindmapFloatingChatProps {
  model?: ModelConfig;
  position: { x: number; y: number };
  onClose: () => void;
  onResponse?: (content: string) => void;
  initialMessages?: ChatMessage[];
  onUpdateMessages?: (messages: ChatMessage[]) => void;
  contextAppendix?: string;
  isOpen?: boolean;
}

export interface MindmapFloatingChatHandle {
  sendMessage: (content: string) => void;
}

export const MindmapFloatingChat = forwardRef<MindmapFloatingChatHandle, MindmapFloatingChatProps>(({ model, position, onClose, onResponse, initialMessages = [], onUpdateMessages, contextAppendix, isOpen = true }, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatPosition, setChatPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dialogIdRef = useRef<string>(`floating_${uuidv4()}`);
  const currentResponseRef = useRef(''); // 用于累积流式响应内容

  // Register with ChatBridge
  useEffect(() => {
    chatBridge.registerHandler('mindmap', {
      sendMessage: (content: string, modelConfig?: ModelConfig) => sendMessage(content, modelConfig),
      getMessages: () => messages
    });

    return () => {
      chatBridge.unregisterHandler('mindmap');
    };
  }, [messages]); // Re-register when messages change to capture closure (or use ref for messages)

  // Notify ChatBridge on message update
  useEffect(() => {
    chatBridge.notifyMessageUpdate('mindmap', messages);
  }, [messages]);

  // 监听外部位置更新
  useEffect(() => {
    setChatPosition(position);
  }, [position]);

  // 加载历史记录
  const loadHistory = useCallback(async () => {
    try {
      const res = await window.ipcRenderer.dialog.list();
      if (res.success && res.data) {
        // 筛选出浮窗对话（以 floating_ 开头）并按时间倒序排序
        const mindmapDialogs = res.data
          .filter((d: any) => d.id.startsWith('floating_'))
          .sort((a: any, b: any) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
        setHistoryList(mindmapDialogs);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  // 切换对话
  const switchDialog = useCallback(async (dialogId: string) => {
    try {
      // 使用 dialogGet 而不是 ipcRenderer.dialog.get，因为后者可能需要对象参数 {id}
      // 但根据 electronAPI 定义，dialogGet 是最安全的
      const res = await window.electronAPI.dialogGet(dialogId);
      if (res.success && res.data) {
        dialogIdRef.current = dialogId;
        const loadedMessages = (res.data.messages || []).map((msg: any) => ({
          id: msg.id,
          role: msg.role === 'system' ? 'assistant' : msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          tokenUsage: msg.metadata?.tokenUsage
        })).filter((m: any) => m.role === 'user' || m.role === 'assistant');
        setMessages(loadedMessages);
        setShowHistory(false);
        onUpdateMessages?.(loadedMessages);
      }
    } catch (e) {
      console.error('Failed to switch dialog', e);
    }
  }, [onUpdateMessages]);

  // 新建对话
  const handleNewChat = useCallback(() => {
    const newId = `floating_${uuidv4()}`;
    dialogIdRef.current = newId;
    setMessages([]);
    setShowHistory(false);
    onUpdateMessages?.([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [onUpdateMessages]);

  // 监听 showHistory 变化
  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory, loadHistory]);

  // Sync messages from props (保留输入状态)
  useEffect(() => {
    // 只在 initialMessages 发生变化且不是当前正在发送的消息时同步
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // 组件挂载时获取焦点
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // 拖拽开始
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  }, []);

  // 拖拽中
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // 限制在屏幕内
      // 窗口宽高分别为 380 和 520
      const maxX = window.innerWidth - 380;
      const maxY = window.innerHeight - 520;
      const minTop = 48; // 菜单栏高度

      setChatPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(minTop, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // 拖拽结束后确保输入框获取焦点
      inputRef.current?.focus();
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Notify ChatBridge on message update
  useEffect(() => {
    chatBridge.notifyMessageUpdate('mindmap', messages);
  }, [messages]);

  const onResponseRef = useRef(onResponse);
  useEffect(() => {
    onResponseRef.current = onResponse;
  }, [onResponse]);

  // Listen to AI stream
  useEffect(() => {
    const handleAiStream = (_: any, data: any) => {
      const { dialogId, content, done } = data;
      if (dialogId !== dialogIdRef.current) return;

      if (content) {
        currentResponseRef.current += content;
      }

      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsgIndex = newMessages.length - 1;
        const lastMsg = newMessages[lastMsgIndex];
        
        if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.fullContent) {
           // 创建新对象以避免直接修改状态 (修复 React StrictMode 下的重复渲染问题)
           const updatedMsg = { 
             ...lastMsg, 
             content: currentResponseRef.current 
           };
           newMessages[lastMsgIndex] = updatedMsg;
           return newMessages;
        } else if (content && !done) {
           return prev;
        }
        return prev;
      });

      if (done) {
        setIsLoading(false);
        // 在渲染周期之外调用回调，避免 "Cannot update a component while rendering" 警告
        onResponseRef.current?.(currentResponseRef.current);
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
    };
  }, []);

  // 发送消息
  const sendMessage = useCallback(async (overrideContent?: string, bridgeModelConfig?: ModelConfig) => {
    const rawContent = (overrideContent ?? input).trim();
    if (!rawContent || isLoading) return;

    const currentModel = bridgeModelConfig || model;
    if (!currentModel) {
      console.error('No model configured for mindmap chat');
      return;
    }

    const fullContent = contextAppendix 
      ? `${rawContent}\n\n${contextAppendix}`
      : rawContent;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: rawContent,
      fullContent: fullContent,
      timestamp: Date.now()
    };

    // Optimistic update
    let currentMessages = [...messages, userMessage];
    
    // Add placeholder assistant message for streaming
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    currentMessages.push(assistantMessage);
    
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);
    currentResponseRef.current = ''; // 重置累积内容

    // Focus input
    inputRef.current?.focus();

    try {
      // Use messageSend to trigger backend and persistence
      const response = await window.electronAPI?.messageSend({
        dialogId: dialogIdRef.current,
        content: fullContent,
        aiIds: [currentModel.id]
      });

      if (!response?.success) {
         // Handle error
         console.error('Message send failed:', response?.error);
         assistantMessage.content = `Error: ${response?.error || 'Unknown error'}`;
         setMessages([...currentMessages]);
         setIsLoading(false);
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      assistantMessage.content = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setMessages([...currentMessages]);
      setIsLoading(false);
    }
  }, [input, isLoading, model, messages, onUpdateMessages, onResponse, contextAppendix]);

  useImperativeHandle(ref, () => ({
    sendMessage: (content: string) => sendMessage(content)
  }), [sendMessage]);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-background border rounded-xl shadow-2xl flex flex-col"
      style={{
        left: chatPosition.x,
        top: chatPosition.y,
        width: '380px',
        height: '520px',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        display: isOpen ? 'flex' : 'none',
      }}
    >
      {/* 头部 - 可拖拽 */}
      <div
        className="flex items-center justify-between p-3 border-b cursor-move bg-muted/30 chat-header select-none"
        onMouseDown={handleDragStart}
        onMouseUp={() => setIsDragging(false)}
      >
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 bg-primary/10">
            <Bot className="w-4 h-4 text-primary" />
          </Avatar>
          <div>
            <div className="font-medium text-sm">{model?.name || 'AI助手'}</div>
            <div className="text-xs text-muted-foreground">{model?.model || '未选择模型'}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNewChat}
            title="新建对话"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowHistory(!showHistory)}
            title="历史记录"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 消息区域或历史记录 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
        {showHistory ? (
          <div className="absolute inset-0 bg-background z-10 p-3 overflow-y-auto">
            <h3 className="font-medium mb-3 text-sm text-muted-foreground px-1">历史记录</h3>
            {historyList.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                暂无历史记录
              </div>
            ) : (
              <div className="space-y-2">
                {historyList.map((dialog) => (
                  <div
                    key={dialog.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                      dialog.id === dialogIdRef.current ? 'bg-accent/50 border-primary/30' : 'bg-card'
                    }`}
                    onClick={() => switchDialog(dialog.id)}
                  >
                    <div className="font-medium text-sm truncate">
                      {dialog.title || '未命名对话'}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {dialog.messages && dialog.messages.length > 0
                          ? dialog.messages[dialog.messages.length - 1].content
                          : '无消息'}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatTime(dialog.updatedAt || dialog.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">与 {model?.name || 'AI助手'} 对话</p>
              <p className="text-xs mt-1">输入消息开始对话</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <Avatar className="w-6 h-6 flex-shrink-0 mt-1">
                {message.role === 'user' ? (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                    <Bot className="w-3 h-3" />
                  </div>
                )}
              </Avatar>

              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown className="prose prose-sm dark:prose-invert">
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
                <div
                  className={`text-[10px] mt-1 flex justify-between items-center ${
                    message.role === 'user'
                      ? 'text-primary-foreground/60'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{formatTime(message.timestamp)}</span>
                  {message.tokenUsage && (
                    <span title={`Prompt: ${message.tokenUsage.promptTokens}, Completion: ${message.tokenUsage.completionTokens}`}>
                      {message.tokenUsage.totalTokens} tokens
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-2">
            <Avatar className="w-6 h-6 flex-shrink-0 mt-1">
              <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-3 h-3" />
              </div>
            </Avatar>
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="min-h-[40px] max-h-[100px] resize-none text-sm"
            rows={1}
            disabled={isLoading}
          />
          <Button
            size="icon"
            className="h-auto"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

MindmapFloatingChat.displayName = 'MindmapFloatingChat';
