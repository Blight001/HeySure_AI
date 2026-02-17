/**
 * HeySure AI - AI 对话 IPC 处理器
 * 处理 AI 对话相关请求：
 * - ai:chat: 发送聊天请求到 AI 模型
 *   - 支持通过 modelId 或 modelConfig 指定模型
 *   - 传递消息列表
 *   - 返回 AI 回复内容和使用统计
 */
import { ipcMain } from 'electron';
import { AIService } from '../services/AIService';

export function aiIPC() {
  const aiService = AIService.getInstance();

  ipcMain.handle('ai:chat', async (_, params: { modelId?: string; modelConfig?: any; messages: any[] }) => {
    try {
      const { modelId, modelConfig, messages } = params;
      const config = modelId || modelConfig;

      if (!config) {
        throw new Error('Model ID or configuration is required');
      }

      const result = await aiService.chat(config, messages);
      return {
        success: true,
        data: result.content,
        usage: result.usage
      };
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      return { success: false, error: error.message };
    }
  });
}
