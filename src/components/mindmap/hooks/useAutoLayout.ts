import { useState, useCallback, useEffect, useRef } from 'react';
import { MindmapNode, LayoutType } from '../types';
import type { ThemeConfig } from '@/types/theme';
import { mindmapStorage } from '../services/mindmap-storage';
import { layoutEngine, defaultLayoutConfig } from '../services/layout-engine';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants';

export const useAutoLayout = (
  nodes: MindmapNode[],
  setNodes: (nodes: MindmapNode[]) => void,
  setNodeIndex: (index: Record<string, MindmapNode>) => void,
  currentTheme: ThemeConfig,
  layoutRefreshRef: React.MutableRefObject<number>,
  isSystemView: boolean = false,
  layoutType: LayoutType = 'tree-right'
) => {
  const [showFullContent, setShowFullContent] = useState(false);
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const prevFingerprintRef = useRef<string>('');

  // Calculate node heights
  const calculateNodeHeights = useCallback(() => {
    if (!showFullContent) return undefined;
    
    const heights: Record<string, number> = {};
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    
    context.font = `${currentTheme.fontSize}px ${currentTheme.fontFamily || 'Inter, sans-serif'}`;
    const contentWidth = NODE_WIDTH - 24; // Assuming padding 24px
    
    nodes.forEach(node => {
      if (!node.name) {
        heights[node.id] = NODE_HEIGHT;
        return;
      }
      
      let lines = 1;
      let currentLineWith = 0;
      for (const char of node.name) {
        const charWidth = context.measureText(char).width;
        if (currentLineWith + charWidth > contentWidth) {
          lines++;
          currentLineWith = charWidth;
        } else {
          currentLineWith += charWidth;
        }
      }
      
      const lineHeight = 20;
      const padding = 20;
      const estimatedHeight = Math.max(NODE_HEIGHT, lines * lineHeight + padding);
      heights[node.id] = estimatedHeight;
    });
    
    return heights;
  }, [nodes, showFullContent, currentTheme]);

  // Update layout when showFullContent changes or nodes update
  useEffect(() => {
    // 生成布局指纹：只包含影响布局的因素（结构、内容、折叠状态），不包含位置(x,y)
    // 这样可以避免因 relayout 改变 x,y 而导致的无限循环
    const generateFingerprint = () => {
      if (!showFullContent) return 'collapsed';
      return nodes.map(n => `${n.id}:${n.name}:${n.children.length}:${n.collapsed ? 1 : 0}`).join('|');
    };

    const fingerprint = generateFingerprint();
    // 将当前主题的字体大小也加入指纹，以便在切换主题时触发重新计算高度
    const fullFingerprint = `${showFullContent}|${currentTheme.fontSize}|${fingerprint}|${layoutType}|${isSystemView}`;

    if (fullFingerprint === prevFingerprintRef.current) {
      return;
    }
    
    prevFingerprintRef.current = fullFingerprint;

    const updateLayout = async () => {
      const heights = calculateNodeHeights();
      
      if (isSystemView) {
        if (!nodes || nodes.length === 0) return;
        
        // Use layout engine directly for system view
        const config = { 
            ...defaultLayoutConfig, 
            type: layoutType,
            nodeHeights: heights 
        };
        
        const result = layoutEngine.applyLayout(nodes, layoutType, config);
        
        // Update nodes with new positions
        const newNodes = nodes.map(n => {
            const pos = result.positions.get(n.id);
            return pos ? { ...n, x: pos.x, y: pos.y } : n;
        });
        
        setNodes(newNodes);
        // We don't need to update nodeIndex since it's just a position update
        // but we should ensure setNodes triggers a re-render
        layoutRefreshRef.current++;
      } else {
        mindmapStorage.setNodeHeights(heights);
        
        // 只有在开启全内容显示，或者之前有节点时才重新布局
        // 如果是刚初始化，可能不需要立即布局，但这里为了安全起见保留逻辑
        if (showFullContent || (!showFullContent && mindmapStorage.getCurrentMap()?.nodes.length)) {
            await mindmapStorage.relayoutEntireMap();
            const updatedMap = mindmapStorage.getCurrentMap();
            setNodes(updatedMap?.nodes ? [...updatedMap.nodes] : []);
            setNodeIndex({ ...mindmapStorage.getNodeIndex() });
            layoutRefreshRef.current++;
        }
      }
    };

    // 使用防抖，避免频繁计算
    const timer = setTimeout(updateLayout, 100);
    return () => clearTimeout(timer);

  }, [showFullContent, calculateNodeHeights, setNodes, setNodeIndex, layoutRefreshRef, nodes, isSystemView, layoutType]);

  return {
    showFullContent, setShowFullContent,
    showLayoutDropdown, setShowLayoutDropdown
  };
};
