/**
 * HeySure AI - 流程 AI 对话浮窗组件
 * 提供流程编辑模式下的 AI 辅助功能：
 * - 消息输入和发送
 * - Markdown 内容渲染
 * - 对话历史展示
 * - Token 使用统计
 * - 流式响应显示
 * - 流程变更建议展示（待确认变更）
 * - 与主聊天界面的消息同步
 * - 上下文变量展示和JSON预览
 */
import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { X, Send, Bot, User, Loader2, History, MessageSquare, Plus, Check, CheckCheck, XIcon, LayoutDashboard, ChevronDown, ChevronRight, FileJson, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import type { PendingFlowChange } from '../hooks/useFlowAI';
import { chatBridge } from '@/services/chatBridge';

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
  extractedJson?: any;
}

// 模型配置类型
interface ModelConfig {
  id: string;
  name: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface FlowFloatingChatProps {
  model?: ModelConfig;
  position: { x: number; y: number };
  onClose: () => void;
  onResponse?: (content: string) => void;
  initialMessages?: ChatMessage[];
  onUpdateMessages?: (messages: ChatMessage[]) => void;
  contextAppendix?: string;
  // 操作流程特有属性
  flowAppendixMd?: string;
  flowStructureMd?: string;
  editInstructionsMd?: string;
  currentFlowId?: string;
  isOpen?: boolean;
}

export interface FlowFloatingChatHandle {
  sendMessage: (content: string) => void;
}

export const FlowFloatingChat = forwardRef<FlowFloatingChatHandle, FlowFloatingChatProps>(({
  model,
  position,
  onClose,
  onResponse,
  initialMessages = [],
  onUpdateMessages,
  contextAppendix,
  flowAppendixMd,
  flowStructureMd,
  editInstructionsMd,
  currentFlowId,
  isOpen = true
}, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatPosition, setChatPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showContextDetails, setShowContextDetails] = useState(false);
  const [showInteractionLog, setShowInteractionLog] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dialogIdRef = useRef<string>(`flow_floating_${uuidv4()}`);

  // Register with ChatBridge
  useEffect(() => {
    chatBridge.registerHandler('flow', {
      sendMessage: (content: string, modelConfig?: ModelConfig) => sendMessage(content, modelConfig),
      getMessages: () => messages
    });

    return () => {
      chatBridge.unregisterHandler('flow');
    };
  }, [messages]);

  // Notify ChatBridge on message update
  useEffect(() => {
    chatBridge.notifyMessageUpdate('flow', messages);
  }, [messages]);

  // 监听外部位置更新加载历史记录
  const loadHistory = useCallback(async () => {
    try {
      const res = await window.ipcRenderer.dialog.list();
      if (res.success && res.data) {
        // 筛选出操作流程浮窗对话（以 flow_floating_ 开头）并按时间倒序排序
        const flowDialogs = res.data
          .filter((d: any) => d.id.startsWith('flow_floating_'))
          .sort((a: any, b: any) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
        setHistoryList(flowDialogs);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  // 切换对话
  const switchDialog = useCallback(async (dialogId: string) => {
    try {
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
    const newId = `flow_floating_${uuidv4()}`;
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
      const maxX = window.innerWidth - 380;
      const maxY = window.innerHeight - 520;
      const minTop = 48;

      setChatPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(minTop, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
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

  // 提取 JSON 的辅助函数
  const extractJson = useCallback((text: string) => {
    const results: any[] = [];
    const extract = (startChar: string, endChar: string) => {
      let startIndex = text.indexOf(startChar);
      while (startIndex !== -1) {
        let balance = 0;
        let endIndex = -1;
        let inString = false;
        let escape = false;

        for (let i = startIndex; i < text.length; i++) {
          const char = text[i];
          if (escape) { escape = false; continue; }
          if (char === '\\') { escape = true; continue; }
          if (char === '"') { inString = !inString; continue; }
          if (!inString) {
            if (char === startChar) balance++;
            else if (char === endChar) {
              balance--;
              if (balance === 0) { endIndex = i; break; }
            }
          }
        }

        if (endIndex !== -1) {
          const potentialJson = text.substring(startIndex, endIndex + 1);
          try {
            let cleanJson = potentialJson.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
            cleanJson = cleanJson.replace(/,\s*([\]}])/g, '$1');
            const parsed = JSON.parse(cleanJson);
            // 简单验证是否包含 flow 操作关键字
            if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null && 'type' in parsed)) {
               results.push(parsed);
            }
          } catch (e) {
            // ignore
          }
        }
        startIndex = text.indexOf(startChar, startIndex + 1);
      }
    };

    extract('[', ']');
    extract('{', '}');
    return results.length > 0 ? results : undefined;
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 发送消息
  const sendMessage = useCallback(async (overrideContent?: string, bridgeModelConfig?: ModelConfig) => {
    const rawContent = (overrideContent ?? input).trim();
    if (!rawContent || isLoading) return;

    const currentModel = bridgeModelConfig || model;
    if (!currentModel) {
      console.error('No model configured for flow chat');
      return;
    }

    // 构建上下文，总是发送完整上下文作为 System Prompt
    const contextParts: string[] = [];

    if (flowStructureMd) {
      contextParts.push(flowStructureMd);
    }

    if (editInstructionsMd) {
      contextParts.push(editInstructionsMd);
    }
    
    // Fallback if separate props are not provided
    if (!flowStructureMd && !editInstructionsMd && flowAppendixMd) {
      contextParts.push(flowAppendixMd);
    }
    
    if (contextAppendix) contextParts.push(contextAppendix);

    const systemPrompt = contextParts.join('\n\n');
    const fullContent = systemPrompt ? `[System Prompt]:\n${systemPrompt}\n\n[User Content]:\n${rawContent}` : rawContent;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: rawContent,
      timestamp: Date.now(),
      fullContent: fullContent
    };

    let currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    onUpdateMessages?.(currentMessages);

    setInput('');
    setIsLoading(true);

    inputRef.current?.focus();

    // 检查是否是第一条消息，如果是则设置标题
    const isFirstMessage = messages.length === 0;

    try {
      const response = await window.electronAPI?.messageSend({
        dialogId: dialogIdRef.current,
        content: rawContent,
        systemPrompt: systemPrompt,
        aiIds: [currentModel.id]
      });

      // 如果是第一条消息，设置对话标题
      if (isFirstMessage && response?.success) {
        try {
          await window.electronAPI?.dialogUpdate(dialogIdRef.current, { title: '操作流程AI' });
        } catch (e) {
          console.error('Failed to update dialog title', e);
        }
      }

      if (response?.success && response?.data) {
        const responseMessages = Array.isArray(response.data) ? response.data : [response.data];

        responseMessages.forEach((msg: any) => {
          if (msg.role === 'assistant') {
            const assistantMessage: ChatMessage = {
              id: msg.id || uuidv4(),
              role: 'assistant',
              content: msg.content || '',
              timestamp: msg.timestamp || Date.now(),
              tokenUsage: msg.metadata?.tokenUsage,
              extractedJson: extractJson(msg.content || '')
            };
            currentMessages = [...currentMessages, assistantMessage];
            setMessages(currentMessages);
            onUpdateMessages?.(currentMessages);
            onResponse?.(assistantMessage.content);
          }
        });
      } else {
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: response?.error || '抱歉，我遇到了一些问题。',
          timestamp: Date.now()
        };
        currentMessages = [...currentMessages, errorMessage];
        setMessages(currentMessages);
        onUpdateMessages?.(currentMessages);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `错误: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now()
      };
      currentMessages = [...currentMessages, errorMessage];
      setMessages(currentMessages);
      onUpdateMessages?.(currentMessages);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, model, messages, onUpdateMessages, onResponse, flowStructureMd, editInstructionsMd, flowAppendixMd, contextAppendix, extractJson]);

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
    <>
      <div
        ref={containerRef}
        className="fixed z-50 bg-background border rounded-xl shadow-2xl flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          left: chatPosition.x,
          top: chatPosition.y,
          width: '380px',
          height: '520px',
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          display: isOpen ? 'flex' : 'none'
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
            className="h-8 w-8 relative"
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
            onClick={() => setShowControlPanel(!showControlPanel)}
            title="控制面板"
          >
            <LayoutDashboard className="h-4 w-4" />
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

      {/* 消息区域或历史记录或待定更改 */}
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
              <p className="text-xs mt-1">可以修改流程图结构</p>
              {flowAppendixMd && (
                <p className="text-[10px] mt-2 text-green-600">✓ 已加载流程上下文</p>
              )}
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
            placeholder="描述你想对流程图做的修改..."
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

    {/* 控制面板浮窗 */}
    {showControlPanel && (
      <div
        className="fixed z-50 bg-background border rounded-xl shadow-2xl flex flex-col"
        style={{
          left: chatPosition.x + 390,
          top: chatPosition.y,
          width: '380px',
          height: '520px',
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)'
        }}
      >
        <div className="flex items-center justify-between p-3 border-b bg-muted/30 select-none">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-primary" />
            <div className="font-medium text-sm">控制面板</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowControlPanel(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Context & Rules Toggle */}
          <div className="border rounded-md overflow-hidden">
            <button
              onClick={() => setShowContextDetails(!showContextDetails)}
              className="w-full flex items-center justify-between p-2 bg-muted/50 hover:bg-muted/80 transition-colors text-xs font-medium"
            >
              <span>Prompt & Context Rules</span>
              {showContextDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            
            {showContextDetails && (
              <div className="p-3 space-y-3 border-t bg-background">
                {flowStructureMd && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">Read Rules (Flow Structure)</h3>
                    <div className="bg-muted/50 rounded-md p-3 text-xs font-mono whitespace-pre-wrap break-all border max-h-40 overflow-y-auto">
                      {flowStructureMd}
                    </div>
                  </div>
                )}
                
                {editInstructionsMd && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">Write Rules (Edit Instructions)</h3>
                    <div className="bg-muted/50 rounded-md p-3 text-xs font-mono whitespace-pre-wrap break-all border max-h-40 overflow-y-auto">
                      {editInstructionsMd}
                    </div>
                  </div>
                )}

                {contextAppendix && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">Additional Context</h3>
                    <div className="bg-muted/50 rounded-md p-3 text-xs font-mono whitespace-pre-wrap break-all border max-h-40 overflow-y-auto">
                      {contextAppendix}
                    </div>
                  </div>
                )}

                {!flowStructureMd && !editInstructionsMd && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">Prompt & Context</h3>
                    <div className="bg-muted/50 rounded-md p-3 text-xs font-mono whitespace-pre-wrap break-all border max-h-40 overflow-y-auto">
                      {contextAppendix || '暂无上下文信息'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interaction Log */}
          <div className="border rounded-md overflow-hidden">
            <button
              onClick={() => setShowInteractionLog(!showInteractionLog)}
              className="w-full flex items-center justify-between p-2 bg-muted/50 hover:bg-muted/80 transition-colors text-xs font-medium"
            >
              <span>Interaction Log</span>
              {showInteractionLog ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {showInteractionLog && (
              <div className="p-3 space-y-4 border-t bg-background">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    暂无交互记录
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={msg.id} className="border rounded-md overflow-hidden bg-card">
                      <div className="flex items-center gap-2 p-2 bg-muted/30 border-b text-xs font-medium">
                        {msg.role === 'user' ? (
                          <User className="w-3 h-3 text-primary" />
                        ) : (
                          <Bot className="w-3 h-3 text-primary" />
                        )}
                        <span className="capitalize">{msg.role}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      
                      <div className="p-2 space-y-2">
                        {msg.role === 'user' ? (
                          <div>
                            <div className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> 发送数据 (提示词)
                            </div>
                            <div className="bg-muted/30 rounded p-2 text-xs font-mono whitespace-pre-wrap break-all border max-h-60 overflow-y-auto">
                              {msg.fullContent || (
                                <span className="text-muted-foreground italic">完整内容不可用 (历史记录)</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1">
                              <FileJson className="w-3 h-3" /> 接收数据 (修改内容)
                            </div>
                            {msg.extractedJson ? (
                              <div className="bg-muted/30 rounded p-2 text-xs font-mono whitespace-pre-wrap break-all border max-h-60 overflow-y-auto">
                                {JSON.stringify(msg.extractedJson, null, 2)}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic pl-1">
                                未发现结构化修改。
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
});

FlowFloatingChat.displayName = 'FlowFloatingChat';

