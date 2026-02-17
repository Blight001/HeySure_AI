/**
 * HeySure AI - 画布历史记录 Hook
 * 实现撤销/重做功能：
 * - 历史状态栈管理
 * - 撤销操作
 * - 重做操作
 * - 历史状态限制
 * - 批量更新优化
 */
// ============ 画布历史记录 Hook ============
import { useState, useCallback, useRef, useEffect } from 'react';
import type { FlowNode, FlowEdge } from '@/types/flow';

interface HistoryState {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function useCanvasHistory(
  currentNodes: FlowNode[],
  currentEdges: FlowEdge[],
  setNodes: (nodes: FlowNode[] | ((prev: FlowNode[]) => FlowNode[])) => void,
  setEdges: (edges: FlowEdge[] | ((prev: FlowEdge[]) => FlowEdge[])) => void
) {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 使用 Ref 保持最新的 nodes 和 edges，避免 saveToHistory 频繁变化
  const nodesRef = useRef(currentNodes);
  const edgesRef = useRef(currentEdges);

  useEffect(() => {
    nodesRef.current = currentNodes;
    edgesRef.current = currentEdges;
  }, [currentNodes, currentEdges]);

  // 初始化历史记录
  const initHistory = useCallback(() => {
    if (history.length === 0 && (nodesRef.current.length > 0 || edgesRef.current.length > 0)) {
      const initialState = {
        nodes: JSON.parse(JSON.stringify(nodesRef.current)),
        edges: JSON.parse(JSON.stringify(edgesRef.current))
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [history.length]);

  // 保存当前状态到历史记录
  const saveToHistory = useCallback((nodes?: FlowNode[], edges?: FlowEdge[]) => {
    const nodesSnapshot = nodes ? JSON.parse(JSON.stringify(nodes)) : JSON.parse(JSON.stringify(nodesRef.current));
    const edgesSnapshot = edges ? JSON.parse(JSON.stringify(edges)) : JSON.parse(JSON.stringify(edgesRef.current));

    setHistory(prev => {
      // 如果当前不是在最新的历史记录上，需要切断后面的记录
      const newHistory = prev.slice(0, historyIndex + 1);
      
      // 避免重复保存相同的状态
      if (newHistory.length > 0) {
        const lastState = newHistory[newHistory.length - 1];
        if (JSON.stringify(lastState.nodes) === JSON.stringify(nodesSnapshot) &&
            JSON.stringify(lastState.edges) === JSON.stringify(edgesSnapshot)) {
          return prev;
        }
      }

      const nextHistory = [
        ...newHistory,
        {
          nodes: nodesSnapshot,
          edges: edgesSnapshot
        }
      ];
      
      // 限制历史记录长度，例如最多 50 步
      if (nextHistory.length > 50) {
        setHistoryIndex(49);
        return nextHistory.slice(nextHistory.length - 50);
      }
      
      setHistoryIndex(newHistory.length);
      return nextHistory;
    });
  }, [historyIndex]);

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      // Deep copy to prevent reference issues
      setNodes(JSON.parse(JSON.stringify(state.nodes)));
      setEdges(JSON.parse(JSON.stringify(state.edges)));
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      // Deep copy to prevent reference issues
      setNodes(JSON.parse(JSON.stringify(state.nodes)));
      setEdges(JSON.parse(JSON.stringify(state.edges)));
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // 获取当前历史状态
  const getCurrentState = useCallback(() => {
    if (historyIndex >= 0 && historyIndex < history.length) {
      return history[historyIndex];
    }
    return { nodes: nodesRef.current, edges: edgesRef.current };
  }, [history, historyIndex]);

  // 清空历史记录
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // 是否可以撤销
  const canUndo = historyIndex > 0;

  // 是否可以重做
  const canRedo = historyIndex < history.length - 1;

  return {
    history,
    historyIndex,
    saveToHistory,
    initHistory,
    clearHistory,
    undo,
    redo,
    getCurrentState,
    canUndo,
    canRedo
  };
}

