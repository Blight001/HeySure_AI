/**
 * HeySure AI - 画布连接 Hook
 * 处理节点之间的连接操作：
 * - 连接线创建
 * - 连接状态管理
 * - 连接目标选择
 * - 连接线删除
 * - 鼠标跟随显示临时连接线
 */
// ============ 画布连接 Hook ============
import { useCallback, useState } from 'react';
import type { FlowEdge } from '@/types/flow';
import { ConnectionState, createEdge } from '../core/types';

interface UseCanvasConnectionOptions {
  canvasRef: React.RefObject<HTMLDivElement>;
  edges: FlowEdge[];
  onEdgesChange?: (edges: FlowEdge[]) => void;
  onSaveHistory?: () => void;
}

export function useCanvasConnection({
  canvasRef,
  edges,
  onEdgesChange,
  onSaveHistory
}: UseCanvasConnectionOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    sourceNodeId: null,
    sourceHandleId: null,
    sourceHandleType: null,
    mouseX: 0,
    mouseY: 0
  });

  // 开始连接（点击输出端口）
  const handleStartConnection = useCallback((
    nodeId: string,
    handleId: string,
    handleType: 'input' | 'output'
  ) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    setConnectionState({
      isConnecting: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      sourceHandleType: handleType,
      mouseX: 0,
      mouseY: 0
    });
  }, [canvasRef]);

  // 更新连接线位置（带缩放和平移参数）
  const updateConnectionPosition = useCallback((
    clientX: number,
    clientY: number,
    pan: { x: number; y: number },
    zoom: number
  ) => {
    if (!connectionState.isConnecting) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const x = (clientX - canvasRect.left - pan.x) / zoom;
    const y = (clientY - canvasRect.top - pan.y) / zoom;

    setConnectionState(prev => ({ ...prev, mouseX: x, mouseY: y }));
  }, [connectionState.isConnecting, canvasRef]);

  // 完成连接（点击输入端口）
  const handleCompleteConnection = useCallback((
    targetNodeId: string,
    targetHandleId: string
  ) => {
    if (!connectionState.sourceNodeId || !connectionState.sourceHandleId) return;

    // 不能自己连接自己
    if (connectionState.sourceNodeId === targetNodeId) {
      cancelConnection();
      return;
    }

    // 检查是否已经存在相同的连接
    const exists = edges.some(edge =>
      edge.source === connectionState.sourceNodeId &&
      edge.target === targetNodeId &&
      edge.sourceHandle === connectionState.sourceHandleId &&
      edge.targetHandle === targetHandleId
    );

    if (!exists) {
      // 添加新边
      const newEdge = createEdge(
        connectionState.sourceNodeId,
        targetNodeId,
        connectionState.sourceHandleId,
        targetHandleId
      );
      onEdgesChange?.([...edges, newEdge]);
      setTimeout(() => onSaveHistory?.(), 0);
    }

    cancelConnection();
  }, [connectionState, edges, onEdgesChange, onSaveHistory]);

  // 取消连接
  const cancelConnection = useCallback(() => {
    setConnectionState({
      isConnecting: false,
      sourceNodeId: null,
      sourceHandleId: null,
      sourceHandleType: null,
      mouseX: 0,
      mouseY: 0
    });
  }, []);

  // 删除边
  const handleDeleteEdge = useCallback((edgeId: string) => {
    const newEdges = edges.filter(edge => edge.id !== edgeId);
    onEdgesChange?.(newEdges);
    setTimeout(() => onSaveHistory?.(), 0);
  }, [edges, onEdgesChange, onSaveHistory]);

  // 获取源节点
  const getSourceNode = useCallback((nodes: { id: string; position: { x: number; y: number } }[]) => {
    if (!connectionState.sourceNodeId) return null;
    return nodes.find(n => n.id === connectionState.sourceNodeId) || null;
  }, [connectionState.sourceNodeId]);

  return {
    connectionState,
    setConnectionState,
    handleStartConnection,
    updateConnectionPosition,
    handleCompleteConnection,
    cancelConnection,
    handleDeleteEdge,
    getSourceNode
  };
}
