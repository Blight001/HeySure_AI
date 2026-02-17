/**
 * HeySure AI - 类型定义导出索引
 * 统一导出所有核心类型：
 * - Dialog: 对话类型
 * - Message: 消息类型
 * - FlowDefinition/FlowNode/FlowEdge: 流程相关类型
 * - UserSettings: 用户设置类型
 */
export * from './dialog';
export * from './message';
export * from './flow';
export * from './common';

// 重新导出常用类型
export type { Dialog, DialogType } from './dialog';
export type { Message, MessageRole } from './message';
export type { 
  FlowDefinition, 
  FlowNode, 
  FlowEdge, 
  FlowNodeType,
  FlowVariable 
} from './flow';
export type { UserSettings, AiParticipant, ConversationMode } from './common';
