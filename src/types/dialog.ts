/**
 * HeySure AI - 对话类型定义
 * 定义对话相关的数据结构：
 * - Dialog: 对话主体
 * - DialogType: 对话类型（单聊/群聊/辩论/协作/流程）
 * - DialogSettings: 对话设置
 * - AiParticipant: AI参与者
 * - AiParticipantRole: AI角色
 * - AiParameters: AI参数
 * - ConversationMode: 对话模式
 */
// ============ 对话类型 ============
export interface Dialog {
  id: string;
  title: string;
  type: DialogType;
  flowId?: string;
  participants: AiParticipant[];
  settings: DialogSettings;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export type DialogType = 'single' | 'group' | 'debate' | 'collaborative' | 'flow';

export interface DialogSettings {
  maxContextMessages: number;
  autoSummarize: boolean;
  summarizeThreshold: number;
  enableMemory: boolean;
}

export interface AiParticipant {
  id: string;
  pluginId: string;
  modelId: string;
  name: string;
  avatar?: string;
  role: AiParticipantRole;
  systemPrompt?: string;
  parameters: AiParameters;
  enabled: boolean;
}

export type AiParticipantRole = 'participant' | 'moderator' | 'judge' | 'affirmative' | 'negative';

export interface AiParameters {
  temperature: number;
  maxTokens: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
}

export type ConversationMode = 'single' | 'group' | 'debate' | 'collaborative';

