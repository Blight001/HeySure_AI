/**
 * HeySure AI - 流程选择 Hook
 * 处理节点的选择操作：
 * - 单个/多个节点选择
 * - 框选功能
 * - 选择状态管理
 * - 全选/取消选择
 * - 选中的节点信息获取
 */
import { useState, useCallback, useRef } from 'react';
import { FlowNode } from '../core/types'; // Adjust import path as needed
import { NODE_WIDTH, NODE_HEIGHT } from '../core/layout'; // Adjust import path as needed

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function useFlowSelection(
  canvasRef: React.RefObject<HTMLDivElement>,
  pan: { x: number; y: number },
  zoom: number,
  canvasNodes: FlowNode[],
  nodeSizes: Map<string, { width: number; height: number }>
) {
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const startSelection = useCallback((x: number, y: number, append: boolean = false) => {
    setIsSelecting(true);
    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y
    });
    if (!append) {
      setSelectedNodeIds(new Set());
    }
  }, []);

  const updateSelection = useCallback((x: number, y: number) => {
    if (isSelecting && selectionBox) {
      setSelectionBox({
        ...selectionBox,
        currentX: x,
        currentY: y
      });
    }
  }, [isSelecting, selectionBox]);

  const endSelection = useCallback(() => {
    if (isSelecting && selectionBox && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      
      // 转换屏幕坐标到画布坐标
      const toCanvasCoord = (x: number, y: number) => ({
        x: (x - rect.left - pan.x) / zoom,
        y: (y - rect.top - pan.y) / zoom
      });

      const start = toCanvasCoord(selectionBox.startX, selectionBox.startY);
      const end = toCanvasCoord(selectionBox.currentX, selectionBox.currentY);

      const selectLeft = Math.min(start.x, end.x);
      const selectTop = Math.min(start.y, end.y);
      const selectRight = Math.max(start.x, end.x);
      const selectBottom = Math.max(start.y, end.y);

      const newSelectedIds = new Set(selectedNodeIds); // 基于现有选择累加

      canvasNodes.forEach(node => {
        const nodeWidth = nodeSizes.get(node.id)?.width || NODE_WIDTH;
        const nodeHeight = nodeSizes.get(node.id)?.height || NODE_HEIGHT;
        
        const nodeLeft = node.position.x;
        const nodeTop = node.position.y;
        const nodeRight = nodeLeft + nodeWidth;
        const nodeBottom = nodeTop + nodeHeight;
        
        // AABB 碰撞检测
        const isIntersecting = !(
          nodeRight < selectLeft || 
          nodeLeft > selectRight || 
          nodeBottom < selectTop || 
          nodeTop > selectBottom
        );

        if (isIntersecting) {
          newSelectedIds.add(node.id);
        }
      });

      setSelectedNodeIds(newSelectedIds);
    }

    setIsSelecting(false);
    setSelectionBox(null);
  }, [isSelecting, selectionBox, canvasRef, pan, zoom, canvasNodes, nodeSizes, selectedNodeIds]);

  const clearSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
  }, []);

  const toggleNodeSelection = useCallback((nodeId: string, isMulti: boolean) => {
    setSelectedNodeIds(prev => {
      const next = new Set(prev);
      if (isMulti) {
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
      } else {
        next.clear();
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  return {
    selectedNodeIds,
    setSelectedNodeIds,
    isSelecting,
    selectionBox,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    toggleNodeSelection
  };
}
