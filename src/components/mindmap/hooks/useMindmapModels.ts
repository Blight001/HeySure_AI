import { useState, useEffect } from 'react';
import { LocalModelConfig } from '../types';
import { mindmapStorage } from '../services/mindmap-storage';

export const useMindmapModels = (mapId: string | null) => {
  const [models, setModels] = useState<LocalModelConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [allowReadMindmap, setAllowReadMindmap] = useState(false);
  const [allowAiEdit, setAllowAiEdit] = useState(false);

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
    if (!selectedModelId || !models.some(model => model.id === selectedModelId)) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  // Auto-save AI config
  useEffect(() => {
    if (!mapId) return;
    mindmapStorage.updateAiConfig({
      selectedModelId,
      allowReadMindmap,
      allowAiEdit
    });
  }, [selectedModelId, allowReadMindmap, allowAiEdit, mapId]);

  return {
    models,
    selectedModelId, setSelectedModelId,
    allowReadMindmap, setAllowReadMindmap,
    allowAiEdit, setAllowAiEdit
  };
};
