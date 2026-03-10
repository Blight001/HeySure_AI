/**
 * HeySure AI - 消息类型定义
 * 定义聊天消息相关的数据结构：
 * - Message: 聊天消息主体
 * - MessageRole: 消息角色（用户/助手/系统/工具）
 * - MessageMetadata: 消息元数据（Token使用、模型ID等）
 * - TokenUsage: Token使用统计
 * - Attachment: 消息附件
 * - ToolCall: 工具调用
 * - ChatRequest/ChatResponse/ChatChunk: API请求响应类型
 */
// ============ 消息类型 ============
export interface Message {
  id: string;
  dialogId: string;
  role: MessageRole;
  content: string;
  aiId?: string;
  aiName?: string;
  aiAvatar?: string;
  timestamp: number;
  metadata: MessageMetadata;
  attachments?: Attachment[];
  tools?: ToolCall[];
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface MessageMetadata {
  tokenUsage?: TokenUsage;
  modelId?: string;
  pluginId?: string;
  finishReason?: string;
  responseTime?: number;
  streamed?: boolean;
  optimistic?: boolean;
  lastSequence?: number;
  isError?: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'code';
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

export interface ToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, any>;
  result?: any;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface ChatRequest {
  messages: Message[];
  modelId: string;
  parameters?: Partial<AiParameters>;
  stream?: boolean;
  signal?: AbortSignal;
}

export interface ChatResponse {
  id: string;
  content: string;
  role: 'assistant';
  metadata: MessageMetadata;
}

export interface ChatChunk {
  id: string;
  content: string;
  delta?: string;
  done: boolean;
  metadata?: Partial<MessageMetadata>;
}

