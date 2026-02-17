/**
 * HeySure AI - 流程剪贴板 Hook
 * 处理节点的剪贴板操作：
 * - 复制节点
 * - 剪切节点
 * - 粘贴节点
 * - 剪贴板状态管理
 */
import { useRef, useCallback } from 'react';
import { FlowNode } from '../core/types';

export function useFlowClipboard(
  canvasNodes: FlowNode[],
  selectedNodeIds: Set<string>,
  setCanvasNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>,
  setSelectedNodeIds: (ids: Set<string>) => void,
  onDeleteNodes: (ids: string[]) => void
) {
  const clipboardNodesRef = useRef<FlowNode[]>([]);

  const handleCopy = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      const nodesToCopy = canvasNodes.filter(n => selectedNodeIds.has(n.id));
      if (nodesToCopy.length > 0) {
        clipboardNodesRef.current = JSON.parse(JSON.stringify(nodesToCopy));
      }
    }
  }, [canvasNodes, selectedNodeIds]);

  const handleCut = useCallback(() => {
    if (selectedNodeIds.size > 0) {
      const nodesToCopy = canvasNodes.filter(n => selectedNodeIds.has(n.id));
      if (nodesToCopy.length > 0) {
        clipboardNodesRef.current = JSON.parse(JSON.stringify(nodesToCopy));
        onDeleteNodes(nodesToCopy.map(n => n.id));
        setSelectedNodeIds(new Set());
      }
    }
  }, [canvasNodes, selectedNodeIds, onDeleteNodes, setSelectedNodeIds]);

  const handlePaste = useCallback(() => {
    if (clipboardNodesRef.current.length > 0) {
      const pastedNodes = clipboardNodesRef.current;
      const newNodes: FlowNode[] = [];
      const newSelectedIds = new Set<string>();

      pastedNodes.forEach(pastedNode => {
        const newId = `${pastedNode.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        const newNode: FlowNode = {
          ...pastedNode,
          id: newId,
          position: {
            x: pastedNode.position.x + 20,
            y: pastedNode.position.y + 20
          },
          data: {
            ...pastedNode.data,
            status: 'idle'
          },
          selected: true
        };
        
        newNodes.push(newNode);
        newSelectedIds.add(newId);
      });
      
      setCanvasNodes(prev => [...prev.map(n => ({...n, selected: false})), ...newNodes]);
      setSelectedNodeIds(newSelectedIds);
      
      // Update clipboard for consecutive pastes
      clipboardNodesRef.current = pastedNodes.map(node => ({
        ...node,
        position: {
          x: node.position.x + 20,
          y: node.position.y + 20
        }
      }));
    }
  }, [setCanvasNodes, setSelectedNodeIds]);

  return {
    handleCopy,
    handleCut,
    handlePaste
  };
}
