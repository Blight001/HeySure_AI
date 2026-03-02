import { useEffect } from 'react';
import { MindmapNode } from '../types';

interface UseMindmapShortcutsProps {
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  editingNodeId: string | null;
  setEditingNodeId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setShowColorPicker: (id: string | null) => void;
  nodeIndex: Record<string, MindmapNode>;
  clipboardData: any;
  isCut: boolean;
  handleAddChild: () => void;
  handleAddProcessTrigger: () => void;
  handleAddSibling: () => void;
  handleDeleteNode: () => void;
  handleCopyNode: () => void;
  handleCutNode: () => void;
  handlePasteNode: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
}

export const useMindmapShortcuts = ({
  selectedNodeId,
  selectedNodeIds,
  editingNodeId,
  setEditingNodeId,
  setEditingName,
  setSelectedNodeId,
  setShowColorPicker,
  nodeIndex,
  clipboardData,
  isCut,
  handleAddChild,
  handleAddProcessTrigger,
  handleAddSibling,
  handleDeleteNode,
  handleCopyNode,
  handleCutNode,
  handlePasteNode,
  handleUndo,
  handleRedo
}: UseMindmapShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查当前焦点是否在输入框中
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;

      // 如果在输入框中，允许原生行为（如复制粘贴），忽略思维导图快捷键
      if (isInput) {
        // 例外：如果需要在输入框中按 Escape 退出编辑或取消焦点，可以在这里处理
        // 目前直接返回，交由输入框自己处理
        return;
      }

      // 如果正在编辑节点内容，忽略快捷键
      if (editingNodeId) return;

      // Ctrl + Tab - 创建流程触发节点
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        if (selectedNodeId) {
          handleAddProcessTrigger();
        }
        return;
      }

      // Ctrl/Cmd + 复制粘贴剪切
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            if (selectedNodeId) { e.preventDefault(); handleCopyNode(); }
            break;
          case 'x':
            if (selectedNodeId) { e.preventDefault(); handleCutNode(); }
            break;
          case 'v':
            e.preventDefault();
            handlePasteNode();
            break;
          case 'z':
            e.preventDefault();
            handleUndo();
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
        return;
      }

      // Tab - 创建子节点
      if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedNodeId) {
          handleAddChild();
        }
        return;
      }

      // Enter - 创建兄弟节点
      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedNodeId) {
          handleAddSibling();
        }
        return;
      }

      // 空格 - 编辑节点内容
      if (e.key === ' ') {
        e.preventDefault();
        if (selectedNodeId) {
          const node = nodeIndex[selectedNodeId];
          if (node) {
            setEditingNodeId(selectedNodeId);
            setEditingName(node.name);
          }
        }
        return;
      }

      // Backspace/Delete - 删除节点
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        handleDeleteNode();
        return;
      }

      // Escape - 取消选择/退出编辑
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setEditingNodeId(null);
        setShowColorPicker(null);
        return;
      }

      // 方向键导航
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!selectedNodeId) {
            // 如果没有选中节点，尝试选中根节点
            const rootNode = Object.values(nodeIndex).find(n => n.isRoot);
            if (rootNode) {
                e.preventDefault();
                setSelectedNodeId(rootNode.id);
            }
            return;
        }

        e.preventDefault();
        const currentNode = nodeIndex[selectedNodeId];
        if (!currentNode) return;

        let nextNodeId: string | null = null;
        
        // 简单逻辑：
        // 右：进入子节点
        // 左：回到父节点
        // 上：上一个兄弟
        // 下：下一个兄弟

        // 更自然的逻辑可能需要结合布局位置，但这里先实现基于树结构的导航
        if (e.key === 'ArrowRight') {
            if (currentNode.children && currentNode.children.length > 0) {
                // 如果有子节点且折叠，展开？或者直接选中第一个子节点
                // 目前逻辑：直接选中第一个子节点
                 nextNodeId = currentNode.children[0];
            }
        } else if (e.key === 'ArrowLeft') {
            if (currentNode.parentId) {
                nextNodeId = currentNode.parentId;
            }
        } else if (e.key === 'ArrowUp') {
            // 向上寻找
            if (currentNode.parentId) {
                const parent = nodeIndex[currentNode.parentId];
                if (parent) {
                    const idx = parent.children.indexOf(currentNode.id);
                    if (idx > 0) {
                        nextNodeId = parent.children[idx - 1];
                    } else {
                         // 如果已经是第一个，是否要跳到父节点的上一个兄弟的最后一个子节点？(DFS遍历逆序)
                         // 保持简单：停留在当前
                    }
                }
            }
        } else if (e.key === 'ArrowDown') {
             // 向下寻找
            if (currentNode.parentId) {
                const parent = nodeIndex[currentNode.parentId];
                if (parent) {
                    const idx = parent.children.indexOf(currentNode.id);
                    if (idx < parent.children.length - 1) {
                        nextNodeId = parent.children[idx + 1];
                    } else {
                         // 已经是最后一个，是否跳到父节点的下一个兄弟？
                         // 保持简单：停留在当前
                    }
                }
            }
        }

        if (nextNodeId) {
            setSelectedNodeId(nextNodeId);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    selectedNodeIds,
    editingNodeId,
    nodeIndex,
    clipboardData,
    isCut,
    handleAddChild,
    handleAddProcessTrigger,
    handleAddSibling,
    handleDeleteNode,
    handleCopyNode,
    handleCutNode,
    handlePasteNode,
    handleUndo,
    handleRedo,
    setEditingNodeId,
    setEditingName,
    setSelectedNodeId,
    setShowColorPicker
  ]);
};
