/**
 * HeySure AI - 流程画布交互 Hook
 * 处理画布上的用户交互：
 * - 画布点击和双击
 * - 鼠标滚轮缩放
 * - 框选操作
 * - 选择清除
 * - 连接状态交互
 */
import { useState, useCallback, useEffect } from 'react';

interface UseFlowCanvasInteractionProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  zoom: number;
  connectionState: { isConnecting: boolean };
  draggingData: any;
  updateConnectionPosition: (x: number, y: number, pan: { x: number; y: number }, zoom: number) => void;
  cancelConnection: () => void;
  handleDragEnd: () => void;
  handleWheelZoom: (deltaY: number, point: { x: number; y: number }) => void;
  
  // Selection
  startSelection: (x: number, y: number, append: boolean) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
  clearSelection: () => void;
}

export function useFlowCanvasInteraction({
  canvasRef,
  pan,
  setPan,
  zoom,
  connectionState,
  draggingData,
  updateConnectionPosition,
  cancelConnection,
  handleDragEnd,
  handleWheelZoom,
  startSelection,
  updateSelection,
  endSelection,
  clearSelection
}: UseFlowCanvasInteractionProps) {
  
  // 画布平移逻辑
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [initialPan, setInitialPan] = useState({ x: 0, y: 0 });

  const handleGlobalMouseMove = useCallback((e: React.MouseEvent) => {
    updateConnectionPosition(e.clientX, e.clientY, pan, zoom);
  }, [updateConnectionPosition, pan, zoom]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // 避免与节点拖拽或连接线操作冲突
    if (connectionState.isConnecting || draggingData) return;
    // 如果点击的是节点内部，不触发画布拖拽
    if ((e.target as HTMLElement).closest('[data-flow-node]')) return;
    
    // 避免 UI 组件交互触发画布拖拽 (如工具栏、下拉菜单)
    if ((e.target as HTMLElement).closest('[data-canvas-toolbar], [data-canvas-ignore], [role="menu"], [role="dialog"]')) return;
    
    // 如果按住 Ctrl 键，开始框选
    if (e.ctrlKey) {
      startSelection(e.clientX, e.clientY, true); // append = true/false depending on requirement, here we can assume append or new. 
      // Existing code said: "不清除现有选择，支持累加选择" (Don't clear existing selection, support accumulation)
    } else {
      // 普通点击画布，清除选择
      clearSelection();
      
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setInitialPan({ x: pan.x, y: pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    handleGlobalMouseMove(e);
    
    // Selection logic handled by parent via updateSelection but we need to know if we are selecting?
    // Wait, the parent hook useFlowSelection has 'isSelecting' state. 
    // Ideally this hook should know if selecting.
    // But since we pass updateSelection, we can just call it. The selection hook checks isSelecting.
    updateSelection(e.clientX, e.clientY);

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({
        x: initialPan.x + dx,
        y: initialPan.y + dy
      });
    }
  };

  const handleCanvasMouseUp = () => {
    endSelection();
    cancelConnection();
    handleDragEnd();
    setIsPanning(false);
  };

  // 滚轮缩放
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      handleWheelZoom(e.deltaY, point);
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, handleWheelZoom]);

  return {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleGlobalMouseMove,
    isPanning
  };
}
