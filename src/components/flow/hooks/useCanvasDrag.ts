/**
 * HeySure AI - 画布拖拽 Hook
 * 处理画布和节点的拖拽操作：
 * - 画布平移拖拽
 * - 节点拖拽移动
 * - 拖拽边界检测
 * - 拖拽历史记录
 * - 缩放比例计算
 */
// ============ 画布拖拽 Hook ============
import { useCallback, useState, useRef, useEffect } from 'react';
import type { FlowNode, FlowEdge } from '@/types/flow';
import type { DragData } from '../core/types';

interface UseCanvasDragOptions {
  canvasRef: React.RefObject<HTMLDivElement>;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange?: (nodes: FlowNode[]) => void;
  onEdgesChange?: (edges: FlowEdge[]) => void;
  onSaveHistory?: (nodes?: FlowNode[], edges?: FlowEdge[]) => void;
  zoom?: number;
  pan?: { x: number; y: number };
  selectedNodeIds?: Set<string>;
}

export function useCanvasDrag({
  canvasRef,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onSaveHistory,
  zoom = 1,
  pan = { x: 0, y: 0 },
  selectedNodeIds = new Set()
}: UseCanvasDragOptions) {
  const [draggingData, setDraggingData] = useState<DragData | null>(null);
  const nodesRef = useRef(nodes);
  // 新增：追踪拖拽过程中的最新节点状态，用于解决 mouseup 时的闭包/状态滞后问题
  const latestNodesRef = useRef(nodes);

  // 使用 ref 追踪拖拽起始位置，避免闭包问题
  const dragStartRef = useRef<{ 
    startX: number; 
    startY: number; 
    initialNodes: Map<string, { x: number; y: number }>;
  } | null>(null);

  // 更新 nodesRef
  useEffect(() => {
    nodesRef.current = nodes;
    // 非拖拽状态下同步 latestNodesRef
    if (!draggingData) {
      latestNodesRef.current = nodes;
    }
  }, [nodes, draggingData]);

  // 处理节点拖拽 (模拟拖拽)
  useEffect(() => {
    if (!draggingData || draggingData.type !== 'canvas-node-move' || !draggingData.nodeId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (e.buttons !== 1) {
        dragStartRef.current = null;
        setDraggingData(null);
        return;
      }

      // 如果是第一次移动，记录起始位置
      if (!dragStartRef.current) {
        const initialNodes = new Map<string, { x: number; y: number }>();
        
        // 如果拖拽的节点在选区内，则移动所有选中的节点
        // 否则只移动当前拖拽的节点
        const isDraggingSelected = selectedNodeIds.has(draggingData.nodeId!);
        const nodesToMove = isDraggingSelected 
          ? nodesRef.current.filter(n => selectedNodeIds.has(n.id))
          : nodesRef.current.filter(n => n.id === draggingData.nodeId);

        nodesToMove.forEach(n => {
          initialNodes.set(n.id, { x: n.position.x, y: n.position.y });
        });

        dragStartRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          initialNodes
        };
        return;
      }

      // 计算鼠标移动距离，考虑缩放
      const dx = (e.clientX - dragStartRef.current.startX) / zoom;
      const dy = (e.clientY - dragStartRef.current.startY) / zoom;

      if (dx === 0 && dy === 0) return;

      // 更新节点位置
      const currentNodes = nodesRef.current;
      const newNodes = currentNodes.map(node => {
        const initialPos = dragStartRef.current!.initialNodes.get(node.id);
        if (initialPos) {
          return { 
            ...node, 
            position: { 
              x: initialPos.x + dx, 
              y: initialPos.y + dy 
            } 
          };
        }
        return node;
      });

      latestNodesRef.current = newNodes;
      onNodesChange?.(newNodes);
    };

    const handleMouseUp = () => {
      // 如果 dragStartRef.current 存在，说明是从 useEffect 开始的拖拽
      // 如果 handleDragEnd 已经运行过（比如在画布内释放），dragStartRef.current 会被设为 null，这里就会跳过
      if (dragStartRef.current) {
        onSaveHistory?.(latestNodesRef.current);
        dragStartRef.current = null;
        setDraggingData(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingData, zoom, onNodesChange, onSaveHistory, selectedNodeIds]);


  // 开始拖拽
  const handleDragStart = useCallback((e: React.DragEvent, data: DragData) => {
    setDraggingData(data);
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // 拖拽经过画布（必须阻止默认行为才能触发 drop）
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggingData?.type === 'canvas-node-move') {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [draggingData?.type]);

  // 拖拽放置到画布
  const handleDrop = useCallback((e: React.DragEvent, createNode: (data: DragData, x: number, y: number) => FlowNode | null) => {
    e.preventDefault();

    if (!draggingData) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // 计算坐标时需要考虑缩放和平移
    // 公式：屏幕坐标 -> 画布坐标
    // 画布 transform: translate(pan.x, pan.y) scale(zoom)
    // 逆变换： (screenX - pan.x) / zoom = canvasX
    const x = (e.clientX - canvasRect.left - pan.x) / zoom - 75; // 节点宽度的一半
    const y = (e.clientY - canvasRect.top - pan.y) / zoom - 25;  // 节点高度的一半

    // 处理画布上节点的移动
    if (draggingData.type === 'canvas-node-move' && draggingData.nodeId) {
      const newNodes = nodes.map(node =>
        node.id === draggingData.nodeId
          ? { ...node, position: { x, y } }
          : node
      );
      latestNodesRef.current = newNodes;
      onNodesChange?.(newNodes);
      onSaveHistory?.(newNodes);
      setDraggingData(null);
      return;
    }

    // 创建新节点
    const newNode = createNode(draggingData, x, y);
    if (newNode) {
      const newNodes = [...nodes, newNode];
      latestNodesRef.current = newNodes;
      onNodesChange?.(newNodes);
      onSaveHistory?.(newNodes);
    }

    setDraggingData(null);
  }, [draggingData, canvasRef, nodes, onNodesChange, onSaveHistory, zoom, pan]);

  // 取消拖拽
  const handleDragEnd = useCallback(() => {
    // 确保在拖拽结束时保存历史记录
    if (draggingData?.type === 'canvas-node-move' && dragStartRef.current) {
      onSaveHistory?.(latestNodesRef.current);
    }
    dragStartRef.current = null;
    setDraggingData(null);
  }, [draggingData, onSaveHistory]);

  // 开始拖拽画布上的节点
  const startNodeDrag = useCallback((e: React.MouseEvent<HTMLElement>, nodeId: string) => {
    // 移除对 connectionState 的依赖，因为这里不需要判断连接状态
    // 如果需要判断，应该作为参数传入或从外部控制
    
    // 初始化拖拽数据
    setDraggingData({
      type: 'canvas-node-move',
      nodeId
    });
    
    // 注意：这里不需要立即设置 dragStartRef，因为会在 mousemove 的第一次触发时设置
    // 这样可以确保获取到最新的节点位置和选区状态
  }, []);

  return {
    draggingData,
    setDraggingData,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    startNodeDrag
  };
}

// 单独的拖拽数据 hook，用于不需要完整画布操作的地方
export function useDragData() {
  const [draggingData, setDraggingData] = useState<DragData | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, data: DragData) => {
    setDraggingData(data);
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingData(null);
  }, []);

  return {
    draggingData,
    setDraggingData,
    handleDragStart,
    handleDragEnd
  };
}

