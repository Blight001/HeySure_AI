import { useState, useCallback } from 'react';

export const useMindmapSelection = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // 切换单个节点选择状态
  const toggleNodeSelection = useCallback((nodeId: string, multiSelect: boolean) => {
    if (multiSelect) {
      setSelectedNodeIds(prev => {
        if (prev.includes(nodeId)) {
          return prev.filter(id => id !== nodeId);
        }
        return [...prev, nodeId];
      });
      // 如果当前有单个选中的节点，保留它
      setSelectedNodeId(prev => prev);
    } else {
      setSelectedNodeIds([nodeId]);
      setSelectedNodeId(nodeId);
    }
  }, []);

  // 添加节点到选择列表
  const addToSelection = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds(prev => {
      const newSet = new Set([...prev]);
      nodeIds.forEach(id => newSet.add(id));
      return Array.from(newSet);
    });
  }, []);

  // 清除所有选择
  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectionBox(null);
  }, []);

  // 设置选择框
  const setSelectionBoxState = useCallback((box: { x: number; y: number; width: number; height: number } | null) => {
    setSelectionBox(box);
  }, []);

  // 检查节点是否被选中
  const isNodeSelected = useCallback((nodeId: string) => {
    return selectedNodeIds.includes(nodeId);
  }, [selectedNodeIds]);

  return {
    selectedNodeId, setSelectedNodeId,
    selectedNodeIds, setSelectedNodeIds,
    editingNodeId, setEditingNodeId,
    editingName, setEditingName,
    showColorPicker, setShowColorPicker,
    selectionBox, setSelectionBoxState,
    toggleNodeSelection,
    addToSelection,
    clearSelection,
    isNodeSelected
  };
};
