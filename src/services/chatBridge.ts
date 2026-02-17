/**
 * HeySure AI - 聊天桥接服务
 * 实现不同聊天模式（普通对话、思维导图、操作流程）之间的消息通信
 * 使用事件发布/订阅模式，支持消息传递和处理器注册
 */
export type ChatMode = 'default' | 'mindmap' | 'flow';

export interface BridgeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ChatHandler {
  sendMessage: (content: string, modelConfig?: any) => void;
  getMessages: () => BridgeMessage[];
}

type Listener = (...args: any[]) => void;

class SimpleEventEmitter {
  private listeners: Map<string, Listener[]> = new Map();

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    return this;
  }

  off(event: string, callback: Listener) {
    if (!this.listeners.has(event)) return this;
    const callbacks = this.listeners.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
    return this;
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners.has(event)) return false;
    this.listeners.get(event)!.forEach(cb => cb(...args));
    return true;
  }
}

class ChatBridge extends SimpleEventEmitter {
  private handlers: Map<ChatMode, ChatHandler> = new Map();

  registerHandler(mode: ChatMode, handler: ChatHandler) {
    this.handlers.set(mode, handler);
    // Emit an event that a handler has been registered, in case UI is waiting
    this.emit('handlerRegistered', mode);
  }

  unregisterHandler(mode: ChatMode) {
    this.handlers.delete(mode);
    this.emit('handlerUnregistered', mode);
  }

  getHandler(mode: ChatMode) {
    return this.handlers.get(mode);
  }

  sendMessage(mode: ChatMode, content: string, modelConfig?: any) {
    const handler = this.handlers.get(mode);
    if (handler) {
      handler.sendMessage(content, modelConfig);
    } else {
      console.warn(`No handler registered for chat mode: ${mode}`);
    }
  }

  getMessages(mode: ChatMode): BridgeMessage[] {
    const handler = this.handlers.get(mode);
    return handler ? handler.getMessages() : [];
  }

  // Called by the handlers to notify listeners (e.g. Home.tsx) about new messages
  notifyMessageUpdate(mode: ChatMode, messages: BridgeMessage[]) {
    this.emit('messageUpdate', { mode, messages });
  }
}

export const chatBridge = new ChatBridge();
