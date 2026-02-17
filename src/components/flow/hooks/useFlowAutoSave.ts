/**
 * HeySure AI - 流程自动保存 Hook
 * 实现流程的自动保存功能：
 * - 定时自动保存
 * - 变更检测
 * - 防抖保存
 * - 保存状态提示
 */
import { useRef, useEffect, useCallback } from 'react';
import type { FlowNode, FlowEdge } from '@/types/flow';
import type { ThemeConfig } from '@/types/theme';

interface UseFlowAutoSaveProps {
  flowId: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  theme?: ThemeConfig;
  onSaveFlow: (nodes: FlowNode[], edges: FlowEdge[], isAuto?: boolean) => void;
  onSaveNode: (nodeId: string) => Promise<void>;
}

export function useFlowAutoSave({
  flowId,
  nodes,
  edges,
  theme,
  onSaveFlow,
  onSaveNode
}: UseFlowAutoSaveProps) {
  const autoSaveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastSnapshot = useRef<string | null>(null);
  
  // Keep track of latest data for the interval
  const latestData = useRef({ nodes, edges, theme });
  useEffect(() => {
    latestData.current = { nodes, edges, theme };
  }, [nodes, edges, theme]);

  const onSaveFlowRef = useRef(onSaveFlow);
  useEffect(() => {
    onSaveFlowRef.current = onSaveFlow;
  }, [onSaveFlow]);

  // Polling for changes
  useEffect(() => {
    if (!flowId) return;

    // Reset snapshot when flowId changes (new session)
    // But we need to be careful: if we just loaded the flow, nodes might be empty initially then populated.
    // If we reset to null, the first check will set lastSnapshot to current (loaded) state.
    // That seems correct.
    lastSnapshot.current = null;

    const interval = setInterval(() => {
      const { nodes: currentNodes, edges: currentEdges, theme: currentTheme } = latestData.current;
      const currentSnapshot = JSON.stringify({ 
        nodes: currentNodes, 
        edges: currentEdges, 
        theme: currentTheme 
      });

      if (lastSnapshot.current === null) {
        // First check, initialize snapshot
        lastSnapshot.current = currentSnapshot;
      } else if (lastSnapshot.current !== currentSnapshot) {
        // Data changed, trigger save
        console.log('FlowAutoSave: Data changed, triggering save');
        lastSnapshot.current = currentSnapshot;
        onSaveFlowRef.current(currentNodes, currentEdges, true);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [flowId]);

  // Debounced node save trigger (Legacy/Optional)
  // Since we are polling the entire state, individual node saves are covered.
  // We keep this as a no-op or pass-through if needed for other side effects,
  // but for persistence, the polling handles it.
  const triggerNodeSave = useCallback((nodeId: string) => {
    // No-op for persistence as polling handles it.
    // Can add specific logic here if needed.
  }, []);

  return {
    triggerNodeSave
  };
}
