/**
 * HeySure AI - 画布缩放 Hook
 * 处理画布的缩放和平移：
 * - 放大/缩小功能
 * - 适应画布
 * - 平移（拖拽画布）
 * - 缩放范围限制
 * - 动画速度设置
 * - 网格显示/隐藏
 */
// ============ 画布缩放 Hook ============
import { useCallback, useState } from 'react';
import { DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, DEFAULT_ANIMATION_SPEED } from '../core/constants';

interface ZoomState {
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  animationSpeed: number;
}

export function useCanvasZoom(initialState?: Partial<ZoomState>) {
  const [zoom, setZoomState] = useState(initialState?.zoom ?? DEFAULT_ZOOM);
  const [pan, setPan] = useState(initialState?.pan ?? { x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(initialState?.showGrid ?? true);
  const [animationSpeed, setAnimationSpeed] = useState(initialState?.animationSpeed ?? DEFAULT_ANIMATION_SPEED);

  // 放大
  const handleZoomIn = useCallback(() => {
    setZoomState(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  // 缩小
  const handleZoomOut = useCallback(() => {
    setZoomState(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  // 重置视图
  const handleResetView = useCallback(() => {
    setZoomState(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  // 缩放处理
  const handleWheelZoom = useCallback((deltaY: number, point?: { x: number; y: number }) => {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + (deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)));
    
    if (point) {
      // 计算缩放中心点相对于画布内容的坐标
      // 公式：newPan = point - (point - oldPan) * (newZoom / oldZoom)
      const scale = newZoom / zoom;
      const newPanX = point.x - (point.x - pan.x) * scale;
      const newPanY = point.y - (point.y - pan.y) * scale;
      
      setPan({ x: newPanX, y: newPanY });
    }
    
    setZoomState(newZoom);
  }, [zoom, pan]);

  // 设置缩放
  const setZoom = useCallback((newZoom: number) => {
    setZoomState(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)));
  }, []);

  // 设置平移
  const setPanOffset = useCallback((offset: { x: number; y: number }) => {
    setPan(offset);
  }, []);

  return {
    zoom,
    pan,
    showGrid,
    animationSpeed,
    setZoom,
    setPan: setPanOffset,
    setShowGrid,
    setAnimationSpeed,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    handleWheelZoom
  };
}

