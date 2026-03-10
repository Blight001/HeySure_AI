/**
 * HeySure AI - 流程和 Python 组件 IPC 处理器
 * 处理与流程编排相关的 IPC 通信：
 * - flow:save: 保存流程定义
 * - flow:get: 获取流程详情
 * - flow:list: 获取流程列表
 * - flow:delete: 删除流程
 * - flow:execute: 执行流程
 * - flow:getExecutionStatus: 获取执行状态
 * - flow:stopExecution: 停止执行
 * - flow:getCategories/saveCategories: 流程分类管理
 * 
 * 同时处理 Python 组件相关 IPC：
 * - python:listComponents: 获取组件列表
 * - python:getComponent: 获取组件详情
 * - python:saveComponent: 保存组件
 * - python:deleteComponent: 删除组件
 * - python:toggleComponent: 切换组件启用状态
 * - python:validateFile: 验证 Python 文件
 */
import { ipcMain } from 'electron';
import { FlowService } from '../services/flowService';
import { PythonComponentService } from '../services/pythonComponentService';

export function flowIPC() {
  const flowService = FlowService.getInstance();
  const pythonService = PythonComponentService.getInstance();

  // ============ 流程相关IPC ============

  // 保存流程
  ipcMain.handle('flow:save', async (_, data: { flow: any }) => {
    try {
      const result = await flowService.saveFlow(data.flow);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 获取流程
  ipcMain.handle('flow:get', async (_, { id }: { id: string }) => {
    try {
      const result = await flowService.getFlow(id);
      if (!result) {
        return { success: false, error: `Flow not found: ${id}` };
      }
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 获取流程列表
  ipcMain.handle('flow:list', async (_, data?: { isTemplate?: boolean }) => {
    try {
      const result = await flowService.listFlows();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 删除流程
  ipcMain.handle('flow:delete', async (_, { id }: { id: string }) => {
    const success = await flowService.deleteFlow(id);
    return { success };
  });

  // 执行流程
  ipcMain.handle('flow:execute', async (_, data: { flowId: string; input: any; mode: 'sync' | 'async' }) => {
    try {
      const result = await flowService.executeFlow(data.flowId, data.input, data.mode);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 获取执行状态
  ipcMain.handle('flow:getExecutionStatus', (_, { id }: { id: string }) => {
    return flowService.getExecutionStatus(id);
  });

  // 停止执行
  ipcMain.handle('flow:stopExecution', (_, { id }: { id: string }) => {
    const success = flowService.stopExecution(id);
    return { success };
  });

  // ============ 流程分类相关IPC ============
  
  // 获取分类数据
  ipcMain.handle('flow:getCategories', async () => {
    return await flowService.getCategories();
  });

  // 保存分类数据
  ipcMain.handle('flow:saveCategories', async (_, data: any) => {
    const success = await flowService.saveCategories(data);
    return { success };
  });

  // ============ Python组件相关IPC ============

  // 获取所有Python组件
  ipcMain.handle('python:listComponents', () => {
    return pythonService.listComponents();
  });

  // 获取单个Python组件
  ipcMain.handle('python:getComponent', (_, { id }: { id: string }) => {
    return pythonService.getComponent(id);
  });

  // 保存Python组件
  ipcMain.handle('python:saveComponent', (_, data: { component: any }) => {
    return pythonService.saveComponent(data.component);
  });

  // 删除Python组件
  ipcMain.handle('python:deleteComponent', (_, { id }: { id: string }) => {
    const success = pythonService.deleteComponent(id);
    return { success };
  });

  // 启用/禁用组件
  ipcMain.handle('python:toggleComponent', (_, { id, enabled }: { id: string; enabled: boolean }) => {
    return pythonService.toggleComponent(id, enabled);
  });

  // 验证Python文件
  ipcMain.handle('python:validateFile', async (_, data: { filePath: string; functionName: string }) => {
    return await pythonService.validateFile(data.filePath, data.functionName);
  });
}
