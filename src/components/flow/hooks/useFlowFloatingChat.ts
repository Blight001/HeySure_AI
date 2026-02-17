/**
 * HeySure AI - 流程浮窗对话 Hook
 * 管理流程编辑中的 AI 对话浮窗：
 * - 浮窗打开/关闭
 * - 浮窗位置管理
 * - 浮窗关联的节点
 * - 模型选择
 */
import { useState, useCallback } from 'react';
import type { LocalModelConfig } from '@/types/flow'; // Adjust import path

export function useFlowFloatingChat(models: LocalModelConfig[], selectedModelId: string | null) {
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [floatingChatModel, setFloatingChatModel] = useState<LocalModelConfig | null>(null);
  const [floatingChatPosition, setFloatingChatPosition] = useState({ x: 0, y: 0 });
  const [floatingChatNodeId, setFloatingChatNodeId] = useState<string | null>(null);

  const clampChatPosition = useCallback((x: number, y: number) => {
    const rect = document.body.getBoundingClientRect();
    const maxX = (rect.width || window.innerWidth) - 400;
    const maxY = (rect.height || window.innerHeight) - 560;
    return {
      x: Math.min(Math.max(x, 10), maxX),
      y: Math.min(Math.max(y, 10), maxY)
    };
  }, []);

  const openFloatingChatAt = useCallback((x: number, y: number) => {
    let model = models.find(m => m.id === selectedModelId);
    if (!model && models.length > 0) {
       model = models[0];
    }
    
    if (!model) return;
    
    setFloatingChatPosition(clampChatPosition(x, y));
    setFloatingChatModel(model);
    setFloatingChatNodeId(null);
    setFloatingChatOpen(true);
  }, [clampChatPosition, models, selectedModelId]);

  const openFloatingChatCentered = useCallback(() => {
    const rect = document.body.getBoundingClientRect();
    const centerX = (rect.width || window.innerWidth) / 2 - 190;
    const centerY = (rect.height || window.innerHeight) / 2 - 260;
    openFloatingChatAt(centerX, centerY);
  }, [openFloatingChatAt]);

  return {
    floatingChatOpen,
    setFloatingChatOpen,
    floatingChatModel,
    setFloatingChatModel,
    floatingChatPosition,
    setFloatingChatPosition,
    floatingChatNodeId,
    setFloatingChatNodeId,
    openFloatingChatAt,
    openFloatingChatCentered
  };
}
