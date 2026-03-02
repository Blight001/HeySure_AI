/**
 * HeySure AI - 插件/模型 IPC 处理器
 * 处理与 AI 模型配置相关的 IPC 通信：
 * - model:list: 获取所有模型配置列表
 * - model:save: 保存或更新模型配置
 * - model:delete: 删除模型配置
 * - model:toggle: 切换模型启用/禁用状态
 * 
 * 模型配置存储在内存和文件中，支持持久化
 */
import { ipcMain, app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, promises as fs } from 'fs';
import {
  ModelConfig,
  DATA_DIR,
  MODELS_FILE,
  ensureDataDir,
  getModelScriptFile
} from '../config/paths';

// 导出给其他模块使用
export const modelConfigs: Map<string, ModelConfig> = new Map();

/**
 * 保存模型配置到文件
 */
async function saveModelConfigs(): Promise<void> {
  await ensureDataDir();
  const data: Record<string, ModelConfig> = {};
  
  for (const [modelId, config] of modelConfigs.entries()) {
    // 复制配置对象，避免修改内存中的数据
    const configToSave = { ...config };
    
    // 如果有自定义请求代码，保存到独立文件
    if (configToSave.requestCode) {
      try {
        const scriptPath = getModelScriptFile(modelId);
        await fs.writeFile(scriptPath, configToSave.requestCode, 'utf-8');
        console.log(`Saved request code for model ${modelId} to ${scriptPath}`);
        
        // 从 JSON 中移除代码，避免冗余
        delete configToSave.requestCode;
      } catch (err) {
        console.error(`Failed to save request code for model ${modelId}:`, err);
      }
    }
    
    data[modelId] = configToSave;
  }
  
  await fs.writeFile(MODELS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 从文件加载模型配置
 */
async function loadModelConfigs(): Promise<void> {
  await ensureDataDir();
  if (existsSync(MODELS_FILE)) {
    try {
      const content = await fs.readFile(MODELS_FILE, 'utf-8');
      const data = JSON.parse(content);
      
      for (const [modelId, config] of Object.entries(data)) {
        const modelConfig = config as ModelConfig;
        
        // 尝试加载独立的代码文件
        const scriptPath = getModelScriptFile(modelId);
        if (existsSync(scriptPath)) {
          try {
            const code = await fs.readFile(scriptPath, 'utf-8');
            modelConfig.requestCode = code;
            console.log(`Loaded request code for model ${modelId} from ${scriptPath}`);
          } catch (err) {
            console.error(`Failed to load request code for model ${modelId}:`, err);
          }
        }
        
        modelConfigs.set(modelId, modelConfig);
      }
      
      console.log('已加载模型配置:', Object.keys(data));
    } catch (error) {
      console.error('加载模型配置失败:', error);
    }
  }
}

/**
 * 初始化模型系统（加载配置）
 */
export async function initModels(): Promise<void> {
  await loadModelConfigs();
}

export function pluginIPC() {
  // ========== 模型配置相关 IPC ==========

  // 获取所有模型配置
  ipcMain.handle('model:list', async () => {
    try {
      const models: ModelConfig[] = [];
      modelConfigs.forEach((config) => {
        models.push(config);
      });
      return { success: true, data: models };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 保存/更新模型配置
  ipcMain.handle('model:save', async (_, model: ModelConfig) => {
    try {
      console.log('收到保存模型请求:', model);
      const now = new Date().toISOString();
      const existingConfig = modelConfigs.get(model.id);
      console.log('现有配置:', existingConfig);

      const savedModel: ModelConfig = {
        ...model,
        createdAt: existingConfig?.createdAt || now,
        updatedAt: now,
      };

      modelConfigs.set(model.id, savedModel);
      console.log('保存到内存:', savedModel);
      await saveModelConfigs(); // 保存到文件
      console.log('保存到文件成功');

      return { success: true, data: savedModel };
    } catch (error: any) {
      console.error('保存模型失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除模型配置
  ipcMain.handle('model:delete', async (_, modelId: string) => {
    try {
      if (modelConfigs.has(modelId)) {
        modelConfigs.delete(modelId);
        
        // 尝试删除独立的脚本文件
        try {
          const scriptPath = getModelScriptFile(modelId);
          if (existsSync(scriptPath)) {
            await fs.unlink(scriptPath);
            console.log(`Deleted script file for model ${modelId}`);
          }
        } catch (err) {
          console.warn(`Failed to delete script file for model ${modelId}:`, err);
        }
        
        await saveModelConfigs(); // 保存到文件
        return { success: true };
      } else {
        return { success: false, error: '模型不存在' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 切换模型启用状态
  ipcMain.handle('model:toggle', async (_, modelId: string, enabled: boolean) => {
    try {
      const config = modelConfigs.get(modelId);
      if (config) {
        const updatedModel: ModelConfig = {
          ...config,
          enabled,
          updatedAt: new Date().toISOString(),
        };
        modelConfigs.set(modelId, updatedModel);
        await saveModelConfigs(); // 保存到文件
        return { success: true, data: updatedModel };
      } else {
        return { success: false, error: '模型不存在' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
