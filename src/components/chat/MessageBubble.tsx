/**
 * HeySure AI - 消息气泡组件
 * 负责渲染单个聊天消息，支持：
 * - 用户/AI 消息显示
 * - Markdown 内容渲染和代码高亮
 * - Token 使用统计展示
 * - 消息复制、重新生成、删除操作
 * - 消息列表组件，支持自动滚动和加载动画
 */
import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import 'highlight.js/styles/atom-one-dark.css';
import { Coins, Clock } from 'lucide-react';

// 代码高亮组件
const CodeBlock = memo(function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 静默处理
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#282c34] text-xs text-gray-400">
        <span className="font-mono">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700"
          onClick={handleCopy}
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </div>
      <pre className="p-4 bg-[#282c34] overflow-x-auto">
        <code className={`language-${language} text-sm`}>{children}</code>
      </pre>
    </div>
  );
});

// 代码高亮组件 props 类型
interface CodeBlockProps {
  language: string;
  children: string;
}

interface MessageBubbleProps {
  message: Message;
  isLatest: boolean;
  showAvatar?: boolean;
  onRegenerate?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isLatest,
  showAvatar = true,
  onRegenerate,
  onCopy,
  onDelete,
}: MessageBubbleProps) {
  const [isCopied, setIsCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      toast({ title: '已复制到剪贴板' });
      setTimeout(() => setIsCopied(false), 2000);
      onCopy?.();
    } catch {
      toast({ title: '复制失败', variant: 'destructive' });
    }
  };

  const formatTime = useMemo(() => (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const renderContent = useMemo(() => () => {
    return (
      <div ref={contentRef} className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            // 解包 ul/ol 中的 p 标签，避免 div/pre 被嵌套在 p 中
            ul({ children }) {
              return <ul className="list-disc list-inside my-2">{children}</ul>;
            },
            ol({ children }) {
              return <ol className="list-decimal list-inside my-2">{children}</ol>;
            },
            li({ children }) {
              // 检查子元素是否包含 CodeBlock（包含 div/pre 的元素）
              return <li className="my-1">{children}</li>;
            },
            p({ children }) {
              // 如果子元素包含 CodeBlock 类型的组件，直接解包
              return <>{children}</>;
            },
            // 自定义 pre 元素，避免代码块被嵌套在 <p> 标签内
            pre({ children }) {
              return <>{children}</>;
            },
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');

              if (!inline && match) {
                return (
                  <CodeBlock language={match[1]}>
                    {codeString}
                  </CodeBlock>
                );
              }

              // 行内代码
              if (inline) {
                return (
                  <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                );
              }

              // 块级代码（无语言标记）
              return (
                <CodeBlock language="text">
                  {codeString}
                </CodeBlock>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  }, [message.content]);

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground px-3 py-1 bg-muted rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 p-4 hover:bg-muted/50 transition-colors ${
        isUser ? 'bg-primary/5' : ''
      }`}
    >
      {/* 头像 */}
      {showAvatar && (
        <div className="flex-shrink-0">
          {isUser ? (
            <Avatar className="w-8 h-8 bg-primary text-primary-foreground">
              <span className="text-sm">我</span>
            </Avatar>
          ) : (
            <Avatar className="w-8 h-8 bg-secondary">
              <span className="text-sm">AI</span>
            </Avatar>
          )}
        </div>
      )}

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {/* 元信息 */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium">
            {isUser ? '你' : message.aiName || 'AI'}
          </span>
          {!isUser && message.metadata?.modelId && (
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
              {message.metadata.modelId}
            </span>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(message.timestamp)}
          </span>
          {message.metadata?.tokenUsage && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                    <Coins className="h-3 w-3" />
                    {message.metadata.tokenUsage.totalTokens} tokens
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <div className="font-medium mb-1">Token 使用详情</div>
                    <div>输入 Token: {message.metadata.tokenUsage.promptTokens.toLocaleString()}</div>
                    <div>输出 Token: {message.metadata.tokenUsage.completionTokens.toLocaleString()}</div>
                    <div className="border-t pt-1 mt-1">
                      总计: <span className="font-medium">{message.metadata.tokenUsage.totalTokens.toLocaleString()}</span>
                    </div>
                    {message.metadata.responseTime && (
                      <div className="border-t pt-1 mt-1">
                        响应时间: {message.metadata.responseTime}ms
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* 消息内容 */}
        <div className={`rounded-lg ${isUser ? '' : ''}`}>
          {renderContent()}
        </div>

        {/* 操作按钮 */}
        {isLatest && (
          <div className="flex items-center gap-1 mt-2 opacity-0 hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCopy}
            >
              {isCopied ? '已复制' : '复制'}
            </Button>
            {!isUser && onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onRegenerate}
              >
                重新生成
              </Button>
            )}
            {!isUser && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                删除
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// 消息列表组件
interface MessageListProps {
  messages: Message[];
  loading?: boolean;
  streaming?: boolean;
  isWaitingForAI?: boolean; // 新的 prop：等待 AI 回复时显示加载动画
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

export const MessageList = memo(function MessageList({
  messages,
  loading,
  streaming,
  isWaitingForAI = false,
  onRegenerate,
  onDelete,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const shouldAutoScrollRef = useRef(true);

  // 监听滚动事件，判断用户是否在底部
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // 如果距离底部小于 100px，则认为是在底部
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldAutoScrollRef.current = isNearBottom;
  };

  // 监听消息变化
  useEffect(() => {
    const messageCount = messages.length;
    const isNewMessage = messageCount > prevMessagesLengthRef.current;

    // 如果是新消息，或者用户当前就在底部，则自动滚动
    if (isNewMessage || shouldAutoScrollRef.current) {
      // 使用 setTimeout 确保 DOM 更新后再滚动
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 0);
      
      if (isNewMessage) {
        shouldAutoScrollRef.current = true;
      }
    }

    prevMessagesLengthRef.current = messageCount;
  }, [messages]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-4">👋</div>
          <p>开始与 AI 对话吧</p>
          <p className="text-sm mt-2">输入消息后按回车或点击发送按钮</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto relative"
    >
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isLatest={index === messages.length - 1}
          showAvatar={message.role !== 'system'}
          onRegenerate={() => onRegenerate?.(message.id)}
          onDelete={() => onDelete?.(message.id)}
        />
      ))}

      {/* 等待 AI 回复的加载动画 */}
      {isWaitingForAI && (
        <div className="flex items-center gap-3 p-4">
          {/* AI 头像 */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm">AI</span>
            </div>
          </div>
          {/* 加载动画 */}
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-muted-foreground">AI 正在思考...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
});
