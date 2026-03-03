/**
 * HeySure AI - 消息 IPC 处理器
 * 处理与聊天消息相关的 IPC 通信：
 * - message:send: 发送消息，调用 AI 模型获取响应
 * - message:list: 获取对话中的消息列表
 * - message:delete: 删除指定消息
 * - message:update: 更新消息内容
 * - message:clear: 清空对话中的所有消息
 * 
 * 支持自定义模型调用、流式响应、Token 使用统计等功能
 */
import { ipcMain, app, WebContents, BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, promises as fs } from 'fs';
import { modelConfigs } from './pluginIPC';
import { DATA_DIR, MESSAGES_FILE, ensureDataDir, DialogStorage, DialogMessage } from '../config/paths';
import { dialogStore } from '../services/dialogStore';
const vm = require('vm');

// 广播对话变更事件
const broadcastDialogChange = () => {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('dialog:changed');
  });
};

export function messageIPC() {
  // 发送消息
  ipcMain.handle(
    'message:send',
    async (event, data: { dialogId: string; content: string; aiIds?: string[]; id?: string; systemPrompt?: string }) => {
      try {
        const { dialogId, content, aiIds, id, systemPrompt } = data;

        // 确保对话存在
        if (!dialogStore.has(dialogId)) {
          // 如果对话不存在，创建它
          const newDialog: DialogStorage = {
            id: dialogId,
            title: dialogId.startsWith('floating_') ? '思维导图AI' : '新对话',
            type: 'single',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isPinned: false,
            messages: []
          };
          dialogStore.set(dialogId, newDialog);
        }

        const dialog = dialogStore.get(dialogId)!;

        // 创建用户消息
        const userMessage: DialogMessage = {
          id: id || uuidv4(),
          dialogId,
          role: 'user',
          content,
          timestamp: Date.now(),
          metadata: {},
        };

        // 添加用户消息
        dialog.messages.push(userMessage);
        dialog.updatedAt = Date.now();

        // 获取 AI 响应
        const aiResponses: any[] = [];

        if (aiIds && aiIds.length > 0) {
          for (const aiId of aiIds) {
            try {
              console.log(`[MessageIPC] Processing AI request for: ${aiId}`);

              // 检查是否是自定义模型（以 model- 开头）
              const isCustomModel = aiId.startsWith('model-');
              let response: any;

              if (isCustomModel) {
                // 处理自定义模型
                const modelConfig = modelConfigs.get(aiId);
                if (!modelConfig) {
                  console.warn(`[MessageIPC] Custom model ${aiId} not found`);
                  aiResponses.push({
                    id: uuidv4(),
                    dialogId,
                    role: 'assistant',
                    aiId,
                    content: `无法找到自定义模型配置: ${aiId}`,
                    timestamp: Date.now(),
                    metadata: { error: true }
                  });
                  continue;
                }

                // 准备上下文消息
                const contextMessages = dialog.messages.map(m => ({
                  role: m.role,
                  content: m.content
                }));

                // 如果有系统提示词，添加到上下文消息的最前面
                if (systemPrompt) {
                  contextMessages.unshift({ role: 'system', content: systemPrompt });
                }

                console.log(`[MessageIPC] Sending chat request to custom model ${aiId}`);
                // 预先生成 ID
                const messageId = uuidv4();
                // 直接调用通义千问 API
                response = await callCustomModelChat(modelConfig, contextMessages, event.sender, { dialogId, messageId });
                console.log(`[MessageIPC] Received response from custom model ${aiId}`);
              } else {
                // 处理内置模型或其他情况
                aiResponses.push({
                  id: uuidv4(),
                  dialogId,
                  role: 'assistant',
                  aiId,
                  content: `无法调用模型 ${aiId}，请检查模型配置是否正确。`,
                  timestamp: Date.now(),
                  metadata: {
                    tokenUsage: {
                      promptTokens: 10,
                      completionTokens: 20,
                      totalTokens: 30,
                    },
                    responseTime: 100,
                  },
                });
                continue;
              }

              if (response) {
                aiResponses.push({
                  id: response.id || uuidv4(),
                  dialogId,
                  role: 'assistant',
                  aiId,
                  content: response.content,
                  timestamp: Date.now(),
                  metadata: response.metadata || {}
                });
              }
            } catch (error) {
              console.error(`[MessageIPC] AI ${aiId} 生成响应失败:`, error);
              aiResponses.push({
                id: uuidv4(),
                dialogId,
                role: 'assistant',
                aiId,
                content: `AI 生成响应失败: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: Date.now(),
                metadata: { error: true }
              });
            }
          }
        } else {
          // 没有指定 AI，使用默认响应
          aiResponses.push({
            id: uuidv4(),
            dialogId,
            role: 'assistant',
            content: '请先配置自定义模型后使用。前往"插件配置"页面添加模型。',
            timestamp: Date.now(),
            metadata: {
              tokenUsage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30,
              },
              responseTime: 100,
            },
          });
        }

        // 添加 AI 响应到对话
        dialog.messages.push(...aiResponses);

        // 保存到文件
        await dialogStore.saveAllDialogs();
        broadcastDialogChange();

        return { success: true, data: [userMessage, ...aiResponses] };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  // 获取消息列表
  ipcMain.handle(
    'message:list',
    async (_, data: { dialogId: string; limit?: number; before?: string }) => {
      try {
        const { dialogId, limit = 50, before } = data;
        const dialog = dialogStore.get(dialogId);
        const dialogMessages = dialog?.messages || [];

        let filtered = dialogMessages;
        if (before) {
          const beforeIndex = dialogMessages.findIndex((m) => m.id === before);
          filtered = dialogMessages.slice(
            0,
            beforeIndex > -1 ? beforeIndex : dialogMessages.length
          );
        }

        return {
          success: true,
          data: filtered.slice(-limit),
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  // 删除消息
  ipcMain.handle(
    'message:delete',
    async (_, data: { dialogId: string; messageId: string }) => {
      try {
        const { dialogId, messageId } = data;
        const dialog = dialogStore.get(dialogId);

        if (dialog) {
          dialog.messages = dialog.messages.filter((m) => m.id !== messageId);
          dialog.updatedAt = Date.now();
          await dialogStore.saveAllDialogs();
          broadcastDialogChange();
        }
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  // 更新消息
  ipcMain.handle(
    'message:update',
    async (_, data: { dialogId: string; messageId: string; content: string }) => {
      try {
        const { dialogId, messageId, content } = data;
        const dialog = dialogStore.get(dialogId);

        if (dialog) {
          const index = dialog.messages.findIndex((m) => m.id === messageId);
          if (index > -1) {
            dialog.messages[index].content = content;
            dialog.updatedAt = Date.now();
            await dialogStore.saveAllDialogs();
            broadcastDialogChange();
          }
        }
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  // 清空对话消息
  ipcMain.handle('message:clear', async (_, dialogId: string) => {
    try {
      const dialog = dialogStore.get(dialogId);
      if (dialog) {
        dialog.messages = [];
        dialog.updatedAt = Date.now();
        await dialogStore.saveAllDialogs();
        broadcastDialogChange();
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

// 自定义模型配置类型
interface ModelConfig {
  id: string;
  name: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  enableMultiTurn: boolean;
  enableStreaming: boolean;
  enableThinking: boolean;
  enableWebSearch: boolean;
  enableWebScraping: boolean;
  enabled: boolean;
  requestCode?: string;
}

/**
 * 调用自定义模型聊天 API
 */
async function callCustomModelChat(
  modelConfig: ModelConfig,
  messages: { role: string; content: string }[],
  sender?: WebContents,
  context?: { dialogId: string; messageId: string }
): Promise<any> {
  const { apiKey, baseUrl, model, enableStreaming, requestCode } = modelConfig;
  
  let response;

  try {
    if (requestCode && requestCode.trim()) {
    console.log(`[CustomModel] Using custom request logic for ${model}`);
    
    // Create VM context
    const sandbox = {
      fetch: global.fetch,
      console: console,
      messages: JSON.parse(JSON.stringify(messages)),
      modelConfig: JSON.parse(JSON.stringify(modelConfig)),
      context: context || {}
    };

    // Execute user code
    try {
      const scriptCode = `
        ${requestCode}
        
        if (typeof request !== 'function') {
           throw new Error("Custom code must define a 'request' function");
        }
        
        request({ messages, modelConfig }, { fetch });
      `;
      
      response = await vm.runInNewContext(scriptCode, sandbox, { timeout: 30000 });
      
    } catch (err: any) {
      console.error(`[CustomModel] Custom code execution error:`, err);
      throw new Error(`Custom request failed: ${err.message}`);
    }
  } else {
    // Default logic
    const apiBase = baseUrl.replace(/\/$/, '');
    const url = `${apiBase}/chat/completions`;

    const requestBody = {
      model: model,
      messages: messages,
      stream: enableStreaming,
    };

    console.log(`[CustomModel] Calling API: ${url} with model: ${model}, stream: ${enableStreaming}`);

    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[CustomModel] API error: ${response.status} ${errorText}`);
    throw new Error(`API 请求失败: ${response.status} ${errorText}`);
  }

    // 处理流式响应
    if (enableStreaming && sender && response.body) {
      const reader = (response.body as any).getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let batchContent = '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

            if (trimmedLine.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmedLine.slice(6));
                const contentChunk = data.choices?.[0]?.delta?.content || '';

                if (contentChunk) {
                  fullContent += contentChunk;
                  batchContent += contentChunk;
                }
              } catch (e) {
                console.warn('Error parsing SSE data:', e);
              }
            }
          }

          if (batchContent) {
            sender.send('ai:stream', {
              dialogId: context?.dialogId,
              messageId: context?.messageId,
              content: batchContent,
              done: false
            });
          }
        }

        // 发送完成信号
        sender.send('ai:stream', {
          dialogId: context?.dialogId,
          messageId: context?.messageId,
          content: '',
          done: true
        });

        // 流式结束后，获取 token 使用统计
        const tokenUsage = await getTokenUsage(modelConfig, messages);

        return {
          id: context?.messageId,
          content: fullContent,
          metadata: {
            streamed: true,
            modelId: model,
            tokenUsage: tokenUsage || {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
            },
            responseTime: 0,
          }
        };

      } catch (error) {
        console.error('Error reading stream:', error);
        throw error;
      }
    }

    // 非流式响应处理
    const responseText = await response.text();
    console.log(`[CustomModel] Response preview: ${responseText.substring(0, 200)}...`);

    // 检查是否是 SSE 格式
    if (responseText.trim().startsWith('data:')) {
      const lines = responseText.split('\n');
      let content = '';
      let usageData: any = null;
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr);
            const chunk = data.choices?.[0]?.delta?.content || data.choices?.[0]?.message?.content || '';
            content += chunk;
            if (data.usage) {
              usageData = data.usage;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
      return {
        id: context?.messageId || uuidv4(),
        content: content || '无响应',
        metadata: {
          modelId: model,
          tokenUsage: usageData ? {
            promptTokens: usageData.prompt_tokens || 0,
            completionTokens: usageData.completion_tokens || 0,
            totalTokens: usageData.total_tokens || 0,
          } : {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
        },
      };
    }

    // 尝试解析 JSON
    try {
      const data = JSON.parse(responseText);
      const content = data.choices?.[0]?.message?.content || '无响应';
      return {
        id: data.id || context?.messageId || uuidv4(),
        content: content,
        metadata: {
          modelId: model,
          tokenUsage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
        },
      };
    } catch (parseError) {
      return {
        id: context?.messageId || uuidv4(),
        content: responseText.substring(0, 1000),
        metadata: { raw: true },
      };
    }
  } catch (error) {
    console.error(`[CustomModel] Chat error:`, error);
    throw error;
  }
}

/**
 * 获取 Token 使用统计（非流式请求）
 */
async function getTokenUsage(
  modelConfig: ModelConfig,
  messages: { role: string; content: string }[]
): Promise<{ promptTokens: number; completionTokens: number; totalTokens: number } | undefined> {
  const { apiKey, baseUrl, model } = modelConfig;

  const apiBase = baseUrl.replace(/\/$/, '');
  const url = `${apiBase}/chat/completions`;

  const requestBody = {
    model: model,
    messages: messages,
    stream: false,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(`[CustomModel] Token usage request failed: ${response.status}`);
      return undefined;
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    if (data.usage) {
      return {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      };
    }

    return undefined;
  } catch (error) {
    console.error('[CustomModel] Failed to get token usage:', error);
    return undefined;
  }
}
