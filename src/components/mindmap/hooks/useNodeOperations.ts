import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { mindmapStorage } from '../services/mindmap-storage';
import { MindmapNode } from '../types';

interface UseNodeOperationsProps {
  nodes: MindmapNode[];
  setNodes: (nodes: MindmapNode[]) => void;
  nodeIndex: Record<string, MindmapNode>;
  setNodeIndex: (index: Record<string, MindmapNode>) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  setEditingNodeId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  layoutRefreshRef: React.MutableRefObject<number>;
  clipboardData: { node: MindmapNode; children: MindmapNode[] } | null;
  setClipboardData: (data: { node: MindmapNode; children: MindmapNode[] } | null) => void;
  isCut: boolean;
  setIsCut: (isCut: boolean) => void;
}

export const useNodeOperations = ({
  nodes,
  setNodes,
  nodeIndex,
  setNodeIndex,
  selectedNodeId,
  setSelectedNodeId,
  selectedNodeIds,
  setSelectedNodeIds,
  setEditingNodeId,
  setEditingName,
  layoutRefreshRef,
  clipboardData,
  setClipboardData,
  isCut,
  setIsCut
}: UseNodeOperationsProps) => {
  const { toast } = useToast();

  const refreshMap = useCallback(() => {
    const updatedMap = mindmapStorage.getCurrentMap();
    setNodes(updatedMap?.nodes ? [...updatedMap.nodes] : []);
    setNodeIndex({ ...mindmapStorage.getNodeIndex() });
    layoutRefreshRef.current++;
  }, [setNodes, setNodeIndex, layoutRefreshRef]);

  const handleAddChild = useCallback(async () => {
    if (!selectedNodeId) { toast({ title: '请先选择节点' }); return; }
    try {
      await mindmapStorage.addNode(selectedNodeId, '新节点');
      refreshMap();
      const updatedMap = mindmapStorage.getCurrentMap();
      const newNode = updatedMap?.nodes[updatedMap.nodes.length - 1];
      if (newNode) {
        setSelectedNodeId(newNode.id);
        setEditingNodeId(newNode.id);
        setEditingName('新节点');
      }
      toast({ title: '添加成功' });
    } catch (error) { toast({ title: '添加失败' }); }
  }, [selectedNodeId, refreshMap, setSelectedNodeId, setEditingNodeId, setEditingName, toast]);

  const handleAddProcessTrigger = useCallback(async () => {
    if (!selectedNodeId) {
      toast({ title: '请先选择节点' });
      return;
    }
    try {
      // Create a node with empty name, specific type and gradient color
      const newNode = await mindmapStorage.addNode(selectedNodeId, '', {
        type: 'process-trigger',
        color: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)'
      });
      refreshMap();
      
      if (newNode) {
        setSelectedNodeId(newNode.id);
        setEditingNodeId(newNode.id);
        setEditingName('');
      }
      toast({ title: '添加流程触发节点成功' });
    } catch (error) {
      toast({ title: '添加失败', description: String(error) });
    }
  }, [selectedNodeId, refreshMap, setSelectedNodeId, setEditingNodeId, setEditingName, toast]);

  const handleUpdateNodeName = useCallback(async (nodeId: string, name: string) => {
    if (!name.trim()) { setEditingNodeId(null); return; }
    try {
      await mindmapStorage.updateNode(nodeId, { name });
      refreshMap();
      setEditingNodeId(null);
      toast({ title: '更新成功' });
    } catch (error) { toast({ title: '更新失败' }); }
  }, [refreshMap, setEditingNodeId, toast]);

  const handleDeleteNode = useCallback(async () => {
    // 优先处理多选删除
    if (selectedNodeIds.length > 0) {
      // 过滤掉根节点
      const idsToDelete = selectedNodeIds.filter(id => !nodeIndex[id]?.isRoot);
      if (idsToDelete.length === 0) {
        toast({ title: '无法删除根节点' });
        return;
      }

      // 优化：只删除最顶层的选中节点（避免重复删除子节点）
      // 如果一个节点的祖先也在待删除列表中，则不需要单独删除该节点
      const topLevelIdsToDelete = idsToDelete.filter(id => {
        let current = nodeIndex[id];
        while (current && current.parentId) {
          if (idsToDelete.includes(current.parentId)) {
            return false; // 祖先也在删除列表中，跳过当前节点
          }
          current = nodeIndex[current.parentId];
        }
        return true;
      });

      try {
        let deletedCount = 0;
        for (const id of topLevelIdsToDelete) {
          await mindmapStorage.deleteNode(id);
          deletedCount++;
        }
        
        if (deletedCount > 0) {
          refreshMap();
          setSelectedNodeId(null);
          setSelectedNodeIds([]);
          toast({ title: `已删除 ${deletedCount} 个节点` });
        }
      } catch (error) {
        toast({ title: '删除失败' });
      }
      return;
    }

    // 单选删除逻辑
    if (!selectedNodeId) { toast({ title: '请先选择节点' }); return; }
    const node = nodeIndex[selectedNodeId];
    if (node?.isRoot) { toast({ title: '无法删除根节点' }); return; }
    try {
      await mindmapStorage.deleteNode(selectedNodeId);
      refreshMap();
      setSelectedNodeId(null);
      toast({ title: '删除成功' });
    } catch (error) { toast({ title: '删除失败' }); }
  }, [selectedNodeId, selectedNodeIds, nodeIndex, refreshMap, setSelectedNodeId, setSelectedNodeIds, toast]);

  const handleCopyNode = useCallback(async () => {
    if (!selectedNodeId) { toast({ title: '请先选择节点' }); return; }
    const node = nodeIndex[selectedNodeId];
    if (node?.isRoot) { toast({ title: '无法复制根节点' }); return; }
    try {
      const copiedData = await mindmapStorage.copyNode(selectedNodeId);
      if (copiedData) {
        setClipboardData(copiedData);
        setIsCut(false);
        toast({ title: '已复制节点' });
      }
    } catch (error) { toast({ title: '复制失败' }); }
  }, [selectedNodeId, nodeIndex, setClipboardData, setIsCut, toast]);

  const handleCutNode = useCallback(async () => {
    if (!selectedNodeId) { toast({ title: '请先选择节点' }); return; }
    const node = nodeIndex[selectedNodeId];
    if (node?.isRoot) { toast({ title: '无法剪切根节点' }); return; }
    try {
      const cutData = await mindmapStorage.cutNode(selectedNodeId);
      if (cutData) {
        setClipboardData(cutData);
        setIsCut(true);
        refreshMap();
        toast({ title: '已剪切节点' });
      }
    } catch (error) { toast({ title: '剪切失败' }); }
  }, [selectedNodeId, nodeIndex, setClipboardData, setIsCut, toast, refreshMap]);

  const handlePasteNode = useCallback(async () => {
    if (!clipboardData || !selectedNodeId) {
      toast({ title: clipboardData ? '请先选择目标节点' : '剪贴板为空' });
      return;
    }
    try {
      const newNode = await mindmapStorage.pasteNode(selectedNodeId, clipboardData);
      if (newNode) {
        refreshMap();
        setSelectedNodeId(newNode.id);
        if (isCut) {
          setClipboardData(null);
          setIsCut(false);
        }
        toast({ title: '粘贴成功' });
      }
    } catch (error) { toast({ title: '粘贴失败' }); }
  }, [clipboardData, selectedNodeId, refreshMap, isCut, setClipboardData, setIsCut, setSelectedNodeId, toast]);

  const handleAddSibling = useCallback(async () => {
    if (!selectedNodeId) { toast({ title: '请先选择节点' }); return; }
    const node = nodeIndex[selectedNodeId];
    if (!node) return;
    if (node.isRoot) { toast({ title: '根节点无法创建兄弟节点' }); return; }
    try {
      const newNode = await mindmapStorage.addSiblingNode(selectedNodeId, '新节点');
      if (newNode) {
        refreshMap();
        setSelectedNodeId(newNode.id);
        setEditingNodeId(newNode.id);
        setEditingName('新节点');
        toast({ title: '添加成功' });
      }
    } catch (error) { toast({ title: '添加失败' }); }
  }, [selectedNodeId, nodeIndex, refreshMap, setSelectedNodeId, setEditingNodeId, setEditingName, toast]);

  const handleToggleCollapse = useCallback(async (nodeId: string) => {
    try {
      await mindmapStorage.toggleCollapse(nodeId);
      refreshMap();
    } catch (error) { toast({ title: '操作失败' }); }
  }, [refreshMap, toast]);

  const handleUpdateNodeColor = useCallback(async (nodeId: string, color: string) => {
    try {
      await mindmapStorage.updateNodeColor(nodeId, color);
      refreshMap();
    } catch (error) { toast({ title: '更新失败' }); }
  }, [refreshMap, toast]);

  return {
    handleAddChild,
    handleAddProcessTrigger,
    handleUpdateNodeName,
    handleDeleteNode,
    handleCopyNode,
    handleCutNode,
    handlePasteNode,
    handleAddSibling,
    handleToggleCollapse,
    handleUpdateNodeColor
  };
};
