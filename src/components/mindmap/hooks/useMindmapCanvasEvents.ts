import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseMindmapCanvasEventsProps {
  scale: number;
  setScale: (scale: number) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
  models: any[];
  selectedModelId: string;
  setFloatingChatOpen: (open: boolean) => void;
  setFloatingChatModel: (model: any) => void;
  setFloatingChatPosition: (pos: { x: number; y: number }) => void;
  floatingChatModel: any;
  nodePositions: Record<string, { x: number; y: number }>;
  setSelectionBoxState: (box: { x: number; y: number; width: number; height: number } | null) => void;
  addToSelection: (nodeIds: string[]) => void;
  clearSelection: () => void;
  // 用于判断是否应该阻止滚轮缩放
  selectedNodeId?: string | null;
  nodeIndex?: Record<string, any>;
  // Ctrl+滚轮搜索回调
  onCtrlWheelSearch?: (direction: 'up' | 'down', nodeId: string, nodeName: string) => void;
}

export const useMindmapCanvasEvents = ({
  scale,
  setScale,
  pan,
  setPan,
  canvasRef,
  models,
  selectedModelId,
  setFloatingChatOpen,
  setFloatingChatModel,
  setFloatingChatPosition,
  floatingChatModel,
  nodePositions,
  setSelectionBoxState,
  addToSelection,
  clearSelection,
  selectedNodeId,
  nodeIndex,
  onCtrlWheelSearch
}: UseMindmapCanvasEventsProps) => {
  const { toast } = useToast();
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const NODE_WIDTH = 140;
  const NODE_HEIGHT = 36;

  // 屏幕坐标转画布坐标
  const screenToCanvasCoords = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - pan.x) / scale;
    const y = (screenY - rect.top - pan.y) / scale;
    return { x, y };
  }, [canvasRef, pan, scale]);

  // Unified scale update function
  const updateScale = useCallback((newScale: number, center?: { x: number, y: number }) => {
    if (!canvasRef.current) return;

    // Clamp scale
    const clampedScale = Number(Math.min(Math.max(newScale, 0.1), 3).toFixed(1));
    if (clampedScale === scale) return;

    let cx, cy;
    if (center) {
      cx = center.x;
      cy = center.y;
    } else {
      const rect = canvasRef.current.getBoundingClientRect();
      cx = rect.width / 2;
      cy = rect.height / 2;
    }

    const contentX = (cx - pan.x) / scale;
    const contentY = (cy - pan.y) / scale;

    const newPanX = cx - contentX * clampedScale;
    const newPanY = cy - contentY * clampedScale;

    setScale(clampedScale);
    setPan({ x: newPanX, y: newPanY });
  }, [scale, pan, canvasRef, setScale, setPan]);

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e: WheelEvent) => {
      // 只要按住 Ctrl，就阻止浏览器默认的缩放行为
      if (e.ctrlKey) {
        e.preventDefault();
      }

      console.log('[Ctrl+Wheel] Event triggered:', { 
        ctrlKey: e.ctrlKey, 
        selectedNodeId, 
        hasCallback: !!onCtrlWheelSearch,
        hasNodeIndex: !!nodeIndex 
      });
      
      // 如果按住 Ctrl 键且有选中节点且有搜索回调，执行搜索跳转
      if (e.ctrlKey && selectedNodeId && onCtrlWheelSearch && nodeIndex) {
        const node = nodeIndex[selectedNodeId];
        console.log('[Ctrl+Wheel] Node found:', node);
        if (node && node.name) {
          const direction = e.deltaY > 0 ? 'down' : 'up';
          console.log('[Ctrl+Wheel] Calling search callback:', { direction, nodeName: node.name });
          // 调用搜索回调，让它内部判断是否有结果
          onCtrlWheelSearch(direction, selectedNodeId, node.name);
          // 如果触发了搜索逻辑，不再执行画布缩放，避免冲突
          return; 
        }
      }

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      updateScale(scale + delta, { x: mouseX, y: mouseY });
    };

    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheelEvent);
    };
  }, [scale, updateScale, canvasRef, selectedNodeId, onCtrlWheelSearch, nodeIndex]);

  // 检查点是否在矩形内
  const isPointInRect = useCallback((
    px: number, py: number,
    rx: number, ry: number, rw: number, rh: number
  ): boolean => {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }, []);

  // 检查节点是否在选择框内（选择框为画布坐标）
  const isNodeInSelectionBox = useCallback((
    nodeId: string,
    selectionBox: { x: number; y: number; width: number; height: number }
  ): boolean => {
    const pos = nodePositions[nodeId];
    if (!pos) return false;

    const nodeWidth = NODE_WIDTH;
    const nodeHeight = NODE_HEIGHT;

    // 节点的中心点
    const nodeCenterX = pos.x + nodeWidth / 2;
    const nodeCenterY = pos.y + nodeHeight / 2;

    // 检查节点中心是否在选择框内
    return isPointInRect(
      nodeCenterX, nodeCenterY,
      selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height
    );
  }, [nodePositions, isPointInRect]);

  // Drag events
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    hasMovedRef.current = false;

    // Ctrl + 左键拖拽进入选择模式
    if (e.ctrlKey && e.button === 0) {
      e.preventDefault();
      setIsSelecting(true);
      const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);
      selectionStartRef.current = { x: e.clientX, y: e.clientY };
      // 保存画布坐标的选择框起点，用于渲染
      setSelectionBoxState({ x: canvasCoords.x, y: canvasCoords.y, width: 0, height: 0 });
      return;
    }

    // 普通左键拖拽平移画布
    if (e.button === 0) {
      setIsDraggingCanvas(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y
      };
    }
  }, [pan, setSelectionBoxState, screenToCanvasCoords]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if ((isSelecting && selectionStartRef.current) || (isDraggingCanvas && dragStartRef.current)) {
      const startX = selectionStartRef.current?.x ?? dragStartRef.current?.x ?? 0;
      const startY = selectionStartRef.current?.y ?? dragStartRef.current?.y ?? 0;
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2)
      );
      if (moveDistance > 5) {
        hasMovedRef.current = true;
      }
    }

    // 处理选择框拖拽
    if (isSelecting && selectionStartRef.current) {
      const startX = selectionStartRef.current.x;
      const startY = selectionStartRef.current.y;
      const currentX = e.clientX;
      const currentY = e.clientY;

      // 计算屏幕坐标的选择框
      const screenX = Math.min(startX, currentX);
      const screenY = Math.min(startY, currentY);
      const screenWidth = Math.abs(currentX - startX);
      const screenHeight = Math.abs(currentY - startY);

      // 转换为画布坐标
      const canvasStart = screenToCanvasCoords(screenX, screenY);
      const canvasEnd = screenToCanvasCoords(screenX + screenWidth, screenY + screenHeight);

      setSelectionBoxState({
        x: canvasStart.x,
        y: canvasStart.y,
        width: canvasEnd.x - canvasStart.x,
        height: canvasEnd.y - canvasStart.y
      });
      return;
    }

    // 处理画布平移
    if (isDraggingCanvas && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      });
    }
  }, [isSelecting, isDraggingCanvas, setPan, setSelectionBoxState, screenToCanvasCoords]);

  const handleCanvasMouseUp = useCallback((e?: React.MouseEvent) => {
    // 完成选择操作
    if (isSelecting) {
      setIsSelecting(false);

      // 如果有鼠标事件，计算最终选择框
      if (e && selectionStartRef.current) {
        const startX = selectionStartRef.current.x;
        const startY = selectionStartRef.current.y;
        const currentX = e.clientX;
        const currentY = e.clientY;

        const screenX = Math.min(startX, currentX);
        const screenY = Math.min(startY, currentY);
        const screenWidth = Math.abs(currentX - startX);
        const screenHeight = Math.abs(currentY - startY);

        // 转换为画布坐标
        const canvasStart = screenToCanvasCoords(screenX, screenY);
        const canvasEnd = screenToCanvasCoords(screenX + screenWidth, screenY + screenHeight);

        const selectionBox = {
          x: canvasStart.x,
          y: canvasStart.y,
          width: canvasEnd.x - canvasStart.x,
          height: canvasEnd.y - canvasStart.y
        };

        // 只有选择框足够大才执行选择
        if (Math.abs(selectionBox.width) > 5 && Math.abs(selectionBox.height) > 5) {
          const selectedNodeIds: string[] = [];
          Object.keys(nodePositions).forEach(nodeId => {
            if (isNodeInSelectionBox(nodeId, selectionBox)) {
              selectedNodeIds.push(nodeId);
            }
          });
          if (selectedNodeIds.length > 0) {
            addToSelection(selectedNodeIds);
          }
        }
      }

      selectionStartRef.current = null;
      setSelectionBoxState(null);
    }

    setIsDraggingCanvas(false);
    dragStartRef.current = null;
  }, [isSelecting, nodePositions, isNodeInSelectionBox, addToSelection, setSelectionBoxState, screenToCanvasCoords]);

  // Floating Chat logic
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
    const selectedModel = selectedModelId ? models.find(model => model.id === selectedModelId) : null;
    const model = selectedModel || floatingChatModel || models[0];
    if (!model) {
      toast({ title: '请先启用一个模型' });
      return;
    }
    setFloatingChatPosition(clampChatPosition(x, y));
    setFloatingChatModel(model);
    setFloatingChatOpen(true);
  }, [clampChatPosition, floatingChatModel, models, selectedModelId, toast, setFloatingChatModel, setFloatingChatOpen, setFloatingChatPosition]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.mindmap-node')) return;
    if (target?.closest('.color-picker')) return;
    if (target?.closest('.node-edit-input')) return;
    openFloatingChatAt(e.clientX - 190, e.clientY - 260);
  }, [openFloatingChatAt]);

  const handleZoomIn = () => updateScale(scale + 0.1);
  const handleZoomOut = () => updateScale(scale - 0.1);

  const wasInteracting = useCallback(() => hasMovedRef.current, []);

  return {
    isDraggingCanvas,
    isSelecting,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasDoubleClick,
    handleZoomIn,
    handleZoomOut,
    updateScale,
    wasInteracting,
    openFloatingChatAt
  };
};
