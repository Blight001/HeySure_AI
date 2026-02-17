/**
 * HeySure AI - API 服务层
 * 封装与 Electron 主进程通信的各种服务：
 * - MessageService: 消息管理（发送、获取、删除、更新）
 * - DialogService: 对话管理（创建、获取列表、获取详情、更新、删除）
 * - FlowService: 流程管理（保存、获取、列表、删除、执行）
 * - SettingsService: 设置管理（获取、保存、重置）
 * - ModelService: 模型配置管理（列表、保存、删除、切换状态）
 * - MessageServiceWrapper: 对话相关方法的兼容性包装
 */
import type { Message } from '../types';

// 消息服务
export class MessageService {
  // 发送消息
  static async send(
    dialogId: string,
    content: string,
    aiIds?: string[],
    messageId?: string
  ): Promise<Message[]> {
    const response = await window.electronAPI.messageSend({
      dialogId,
      content,
      aiIds,
      id: messageId
    });

    if (!response.success) {
      throw new Error(response.error || '发送消息失败');
    }

    return response.data;
  }

  // 获取消息列表
  static async list(
    dialogId: string,
    options?: { limit?: number; before?: string }
  ): Promise<Message[]> {
    const response = await window.electronAPI.messageList({
      dialogId,
      ...options,
    });

    if (!response.success) {
      throw new Error(response.error || '获取消息列表失败');
    }

    return response.data;
  }

  // 删除消息
  static async delete(dialogId: string, messageId: string): Promise<void> {
    const response = await window.electronAPI.messageDelete({
      dialogId,
      messageId,
    });

    if (!response.success) {
      throw new Error(response.error || '删除消息失败');
    }
  }

  // 更新消息
  static async update(
    dialogId: string,
    messageId: string,
    content: string
  ): Promise<void> {
    const response = await window.electronAPI.messageUpdate({
      dialogId,
      messageId,
      content,
    });

    if (!response.success) {
      throw new Error(response.error || '更新消息失败');
    }
  }
}

// 对话服务
export class DialogService {
  // 创建对话
  static async create(data: { title?: string; type: string }): Promise<any> {
    const response = await window.electronAPI.dialogCreate(data);
    if (!response.success) {
      throw new Error(response.error || '创建对话失败');
    }
    return response.data;
  }

  // 获取对话列表
  static async list(options?: { search?: string; limit?: number }): Promise<any[]> {
    const response = await window.electronAPI.dialogList(options);
    if (!response.success) {
      throw new Error(response.error || '获取对话列表失败');
    }
    return response.data || [];
  }

  // 获取对话详情
  static async get(id: string): Promise<any> {
    const response = await window.electronAPI.dialogGet(id);
    if (!response.success) {
      throw new Error(response.error || '获取对话详情失败');
    }
    return response.data;
  }

  // 更新对话
  static async update(id: string, data: any): Promise<any> {
    const response = await window.electronAPI.dialogUpdate(id, data);
    if (!response.success) {
      throw new Error(response.error || '更新对话失败');
    }
    return response.data;
  }

  // 删除对话
  static async delete(id: string): Promise<void> {
    const response = await window.electronAPI.dialogDelete(id);
    if (!response.success) {
      throw new Error(response.error || '删除对话失败');
    }
  }
}

// 流程服务
export class FlowService {
  // 保存流程
  static async save(flow: any): Promise<any> {
    const response = await window.electronAPI.flowSave(flow);
    if (!response.success) {
      throw new Error(response.error || '保存流程失败');
    }
    return response.data;
  }

  // 获取流程
  static async get(id: string): Promise<any> {
    const response = await window.electronAPI.flowGet(id);
    if (!response.success) {
      throw new Error(response.error || '获取流程失败');
    }
    return response.data;
  }

  // 获取流程列表
  static async list(options?: { isTemplate?: boolean }): Promise<any[]> {
    const response = await window.electronAPI.flowList(options);
    if (!response.success) {
      throw new Error(response.error || '获取流程列表失败');
    }
    return response.data;
  }

  // 删除流程
  static async delete(id: string): Promise<void> {
    const response = await window.electronAPI.flowDelete(id);
    if (!response.success) {
      throw new Error(response.error || '删除流程失败');
    }
  }

  // 执行流程
  static async execute(id: string, input: any): Promise<any> {
    const response = await window.electronAPI.flowExecute({ id, input });
    if (!response.success) {
      throw new Error(response.error || '执行流程失败');
    }
    return response.data;
  }
}

// 设置服务
export class SettingsService {
  // 获取设置
  static async get(key?: string): Promise<any> {
    const response = await window.electronAPI.settingsGet(key);
    if (!response.success) {
      throw new Error(response.error || '获取设置失败');
    }
    return response.data;
  }

  // 保存设置
  static async set(key: string, value: any): Promise<void> {
    const response = await window.electronAPI.settingsSet({ key, value });
    if (!response.success) {
      throw new Error(response.error || '保存设置失败');
    }
  }

  // 重置设置
  static async reset(keys?: string[]): Promise<void> {
    const response = await window.electronAPI.settingsReset(keys);
    if (!response.success) {
      throw new Error(response.error || '重置设置失败');
    }
  }
}

// 模型配置服务
export class ModelService {
  // 获取模型列表
  static async list(): Promise<any[]> {
    const response = await window.electronAPI.modelList();
    if (!response.success) {
      throw new Error(response.error || '获取模型列表失败');
    }
    return response.data || [];
  }

  // 保存模型
  static async save(model: any): Promise<any> {
    const response = await window.electronAPI.modelSave(model);
    if (!response.success) {
      throw new Error(response.error || '保存模型失败');
    }
    return response.data;
  }

  // 删除模型
  static async delete(modelId: string): Promise<void> {
    const response = await window.electronAPI.modelDelete(modelId);
    if (!response.success) {
      throw new Error(response.error || '删除模型失败');
    }
  }

  // 切换模型启用状态
  static async toggle(modelId: string, enabled: boolean): Promise<any> {
    const response = await window.electronAPI.modelToggle(modelId, enabled);
    if (!response.success) {
      throw new Error(response.error || '切换模型状态失败');
    }
    return response.data;
  }
}

// 对话相关方法（兼容性包装）
export const MessageServiceWrapper = {
  async listDialogs(options?: { search?: string; limit?: number }): Promise<any[]> {
    return DialogService.list(options);
  },
  async createDialog(data: { title?: string; type: string }): Promise<any> {
    return DialogService.create(data);
  },
  async updateDialog(id: string, data: any): Promise<any> {
    return DialogService.update(id, data);
  },
  async deleteDialog(id: string): Promise<void> {
    return DialogService.delete(id);
  },
};
