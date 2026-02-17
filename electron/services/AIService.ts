/**
 * HeySure AI - AI 服务层
 * 封装与各种 AI 模型 API 的通信
 * 使用 OpenAI 兼容接口，支持自定义模型配置
 * 提供聊天和 Embedding 功能
 */
import OpenAI from 'openai';
import { ModelConfig } from '../config/paths';
import { modelConfigs } from '../ipc/pluginIPC';

// 返回类型包含 usage 信息
interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public async chat(config: ModelConfig | string, messages: { role: string; content: string }[]): Promise<AIResponse> {
    let modelConfig: ModelConfig | undefined;

    if (typeof config === 'string') {
      modelConfig = modelConfigs.get(config);
      if (!modelConfig) {
        throw new Error(`Model config with ID ${config} not found`);
      }
    } else {
      modelConfig = config;
    }

    if (!modelConfig.apiKey || !modelConfig.baseUrl) {
        throw new Error('Invalid model configuration: missing API Key or Base URL');
    }

    console.log('[AIService] Calling AI with config:', modelConfig.name, modelConfig.model);
    console.log('[AIService] Messages:', JSON.stringify(messages));

    const client = new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseUrl,
    });

    try {
      const completion = await client.chat.completions.create({
        model: modelConfig.model,
        messages: messages as any,
        stream: false,
      });

      const response = completion.choices[0]?.message?.content || '';
      console.log('[AIService] Response received:', response.substring(0, 50) + '...');

      // 提取 usage 信息
      const usage: AIResponse['usage'] = completion.usage ? {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens
      } : undefined;

      console.log('[AIService] Usage:', usage);

      return { content: response, usage };
    } catch (error: any) {
      console.error('[AIService] Error:', error);
      throw error;
    }
  }

  public async getEmbedding(text: string, config: ModelConfig): Promise<number[]> {
    if (!config.apiKey || !config.baseUrl) {
      throw new Error('Invalid model configuration: missing API Key or Base URL');
    }

    // Replace newlines with spaces for better embeddings
    const cleanText = text.replace(/\n/g, ' ');

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });

    try {
      // Note: Not all models support embeddings, and the API path might vary.
      // Standard OpenAI API is /v1/embeddings.
      // Some providers might need specific model names for embeddings.
      // For now, we use the configured model, but typically embedding models are different (e.g. text-embedding-3-small).
      // We might need a separate config for embedding model.
      // For simplicity, we assume the user picks an embedding-capable model or we default to a standard one if the provider supports it.
      // However, usually we need a specific embedding model name.
      // Let's assume the passed config *is* for an embedding model or the user has a default one.
      // Actually, standard LLMs (gpt-4, etc.) don't do embeddings.
      // We should probably ask the user for an embedding model config or use a default one if possible.
      // But given the constraints, let's try to use the model provided or fallback.
      
      // Better approach: Allow selecting an embedding model in the UI. 
      // For now, let's try to use 'text-embedding-3-small' if the base URL allows, 
      // or use the model name from config if it looks like an embedding model.
      
      const embeddingModel = config.model.includes('embedding') ? config.model : 'text-embedding-3-small';
      
      const response = await client.embeddings.create({
        model: embeddingModel,
        input: cleanText,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      console.error('[AIService] Embedding Error:', error);
      throw error;
    }
  }
}
