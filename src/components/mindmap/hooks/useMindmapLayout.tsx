/**
 * HeySure AI - 思维导图布局 Hook
 * 计算思维导图节点的布局位置，包括：
 * - 获取可见的子节点（考虑折叠状态）
 * - 计算节点位置（基于层级和方向）
 * - 处理节点位置的偏移和递归计算
 * - 支持不同的布局方向（水平、垂直）
 */
import React, { useCallback, useMemo } from 'react';
import { MindmapNode } from '../types';
import type { ThemeConfig } from '@/types/theme';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants';

export const useMindmapLayout = (
  nodes: MindmapNode[],
  nodeIndex: Record<string, MindmapNode>,
  rootNode: MindmapNode | undefined,
  currentTheme: ThemeConfig
) => {
  // 获取可见的子节点
  const getVisibleChildren = useCallback((nodeId: string): MindmapNode[] => {
    const node = nodeIndex[nodeId];
    if (!node) return [];
    if (node.collapsed) return [];
    return node.children
      .map(childId => nodeIndex[childId])
      .filter(Boolean)
      .sort((a, b) => (a.y || 0) - (b.y || 0));
  }, [nodeIndex]);

  // 使用 useMemo 统一计算所有节点位置，确保连线和节点同步更新
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
      positions[node.id] = {
        x: (node.x || 0),
        y: (node.y || 0)
      };
    });
    return positions;
  }, [nodes]);

  // 绘制连接线 - 使用 useMemo 确保与节点同步更新
  const connectionsElement = useMemo(() => {
    const connections: React.ReactNode[] = [];

    const drawLine = (parent: MindmapNode, child: MindmapNode) => {
      const parentPos = nodePositions[parent.id] || { x: 0, y: 0 };
      const childPos = nodePositions[child.id] || { x: 0, y: 0 };

      const parentX = parentPos.x + NODE_WIDTH / 2;
      const parentY = parentPos.y + NODE_HEIGHT / 2;
      const childX = childPos.x + NODE_WIDTH / 2;
      const childY = childPos.y + NODE_HEIGHT / 2;

      let d = '';
      const style = currentTheme.connectionStyle;

      if (style === 'curve') {
        const cp1x = parentX + (childX - parentX) / 2;
        const cp1y = parentY;
        const cp2x = parentX + (childX - parentX) / 2;
        const cp2y = childY;
        d = `M ${parentX} ${parentY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${childX} ${childY}`;
      } else if (style === 'polyline') {
        const midX = parentX + (childX - parentX) / 2;
        d = `M ${parentX} ${parentY} L ${midX} ${parentY} L ${midX} ${childY} L ${childX} ${childY}`;
      } else {
        // straight
        d = `M ${parentX} ${parentY} L ${childX} ${childY}`;
      }

      return (
        <path
          key={`${parent.id}-${child.id}`}
          d={d}
          stroke={currentTheme.connectionColor}
          strokeWidth={currentTheme.connectionWidth}
          fill="none"
        />
      );
    };

    const processNode = (nodeId: string) => {
      const node = nodeIndex[nodeId];
      if (!node) return;
      const children = getVisibleChildren(nodeId);
      for (const child of children) {
        connections.push(drawLine(node, child));
        processNode(child.id);
      }
    };

    if (rootNode) processNode(rootNode.id);
    return (
      <svg 
        className="mindmap-connections" 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          overflow: 'visible', 
          pointerEvents: 'none' 
        }}
      >
        {connections}
      </svg>
    );
  }, [nodeIndex, nodePositions, rootNode, getVisibleChildren, currentTheme]);

  return {
    getVisibleChildren,
    nodePositions,
    connectionsElement
  };
};
