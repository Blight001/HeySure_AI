/**
 * HeySure AI - 流程快捷键 Hook
 * 处理键盘快捷键：
 * - Ctrl+Z 撤销
 * - Ctrl+Y 重做
 * - Ctrl+S 保存
 * - Ctrl+C 复制
 * - Ctrl+X 剪切
 * - Ctrl+V 粘贴
 * - Delete 删除
 * - Escape 取消选择/连接
 */
import { useEffect } from 'react';

interface UseFlowShortcutsProps {
  undo: () => void;
  redo: () => void;
  onSave: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onCancelConnection: () => void;
  onClearSelection: () => void;
  isConnecting: boolean;
  hasSelection: boolean;
}

export function useFlowShortcuts({
  undo,
  redo,
  onSave,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onCancelConnection,
  onClearSelection,
  isConnecting,
  hasSelection
}: UseFlowShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' ||
          (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (!e.shiftKey) undo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      // Ctrl+S: Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onSave();
      }

      // Ctrl+C: Copy
      if (e.ctrlKey && e.key === 'c') {
        onCopy();
      }

      // Ctrl+X: Cut
      if (e.ctrlKey && e.key === 'x') {
        onCut();
      }

      // Ctrl+V: Paste
      if (e.ctrlKey && e.key === 'v') {
        onPaste();
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
        e.preventDefault();
        onDelete();
      }
      
      if (e.key === 'Escape') {
        if (isConnecting) {
          e.preventDefault();
          onCancelConnection();
        } else if (hasSelection) {
          e.preventDefault();
          onClearSelection();
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo, 
    redo, 
    onSave, 
    onCopy, 
    onCut, 
    onPaste, 
    onDelete, 
    onCancelConnection, 
    onClearSelection, 
    isConnecting, 
    hasSelection
  ]);
}
