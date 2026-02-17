/**
 * HeySure AI - 思维导图视图 Hook
 * 管理思维导图的视图状态：
 * - 缩放比例
 * - 平移位置
 * - 画布拖拽状态
 * - 视图状态自动保存
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { mindmapStorage } from '../services/mindmap-storage';

export const useMindmapView = (mapId: string | null) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const viewStateSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save view state
  useEffect(() => {
    if (!mapId) return;
    
    if (viewStateSaveTimerRef.current) {
      clearTimeout(viewStateSaveTimerRef.current);
    }

    viewStateSaveTimerRef.current = setTimeout(() => {
      mindmapStorage.updateViewState(scale, pan.x, pan.y);
    }, 500); // 500ms debounce

    return () => {
      if (viewStateSaveTimerRef.current) {
        clearTimeout(viewStateSaveTimerRef.current);
      }
    };
  }, [scale, pan, mapId]);

  return {
    scale, setScale,
    pan, setPan,
    isDraggingCanvas, setIsDraggingCanvas
  };
};
