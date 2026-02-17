/**
 * HeySure AI - 思维导图状态 Hook
 * 管理思维导图的核心状态：
 * - 节点列表和索引
 * - 思维导图名称和 ID
 * - 布局类型
 * - 主题配置
 * - 状态更新方法
 */
import { useState, useCallback, useRef } from 'react';
import { mindmapStorage } from '../services/mindmap-storage';
import { MindmapNode } from '../types';
import type { ThemeConfig } from '@/types/theme';
import { getDefaultTheme } from '@/styles/theme';
import { LayoutType } from '../types';

export const useMindmapState = () => {
  const [nodes, setNodes] = useState<MindmapNode[]>([]);
  const [nodeIndex, setNodeIndex] = useState<Record<string, MindmapNode>>({});
  const [mapName, setMapName] = useState('新思维导图');
  const [mapId, setMapId] = useState<string | null>(null);
  const [layoutType, setLayoutType] = useState<LayoutType>('tree-right');
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(getDefaultTheme());
  
  // Ref for layout refresh count, used to force re-renders or checks
  const layoutRefreshRef = useRef(0);

  const updateNodes = useCallback((newNodes: MindmapNode[]) => {
    setNodes(newNodes);
    // Update index when nodes change might be expensive to do here if not from storage
    // But usually we get nodes and index together or rebuild index.
    // mindmapStorage usually handles the index.
  }, []);

  return {
    nodes, setNodes,
    nodeIndex, setNodeIndex,
    mapName, setMapName,
    mapId, setMapId,
    layoutType, setLayoutType,
    currentTheme, setCurrentTheme,
    layoutRefreshRef,
    updateNodes
  };
};
