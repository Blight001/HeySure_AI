/**
 * HeySure AI - 流程模型 Hook
 * 管理流程中使用的 AI 模型：
 * - 模型列表加载
 * - 模型选择
 * - 模型权限设置
 * - 模型启用状态管理
 */
import { useState, useEffect } from 'react';
import { LocalModelConfig } from '@/types/flow';
import { flowStorage } from '../flow-storage';

export const useFlowModels = (flowId: string | null) => {
  const [models, setModels] = useState<LocalModelConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [allowReadFlow, setAllowReadFlow] = useState(false);
  const [allowAiEdit, setAllowAiEdit] = useState(false);
  const [allowAiAutoExecution, setAllowAiAutoExecution] = useState(false);

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // @ts-ignore
        const response = await window.electronAPI?.modelList?.();
        if (response?.success && response.data) {
          setModels(response.data.filter((m: LocalModelConfig) => m.enabled));
        }
      } catch (error) {
        console.error('加载模型配置失败:', error);
      }
    };
    loadModels();
  }, []);

  // Select default model
  useEffect(() => {
    if (models.length === 0) {
      return;
    }
    
    // 如果已有 flowId，尝试加载 flow 中的配置
    if (flowId) {
      const currentFlow = flowStorage.getCurrentFlow();
      if (currentFlow?.aiConfig) {
        if (models.some(m => m.id === currentFlow.aiConfig!.selectedModelId)) {
          setSelectedModelId(currentFlow.aiConfig!.selectedModelId);
        } else {
           // 配置中的模型不存在，使用第一个
           if (!selectedModelId) setSelectedModelId(models[0].id);
        }
        setAllowReadFlow(currentFlow.aiConfig!.allowReadFlow);
        setAllowAiEdit(currentFlow.aiConfig!.allowAiEdit);
        setAllowAiAutoExecution(currentFlow.aiConfig!.allowAiAutoExecution || false);
        return;
      }
    }

    if (!selectedModelId || !models.some(model => model.id === selectedModelId)) {
      setSelectedModelId(models[0].id);
    }
  }, [models, flowId]);

  // Auto-save AI config
  useEffect(() => {
    if (!flowId) return;
    flowStorage.updateAiConfig({
      selectedModelId,
      allowReadFlow,
      allowAiEdit,
      allowAiAutoExecution
    });
  }, [selectedModelId, allowReadFlow, allowAiEdit, allowAiAutoExecution, flowId]);

  return {
    models,
    setModels,
    selectedModelId, setSelectedModelId,
    allowReadFlow, setAllowReadFlow,
    allowAiEdit, setAllowAiEdit,
    allowAiAutoExecution, setAllowAiAutoExecution
  };
};
