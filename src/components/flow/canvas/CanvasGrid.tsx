/**
 * HeySure AI - 流程画布网格背景组件
 * 绘制流程画布的背景网格，提供视觉对齐参考：
 * - SVG pattern 实现的网格效果
 * - 可配置网格显示/隐藏
 * - 可自定义网格颜色
 * - 使用 pattern 实现高效渲染
 */
// ============ 网格背景组件 ============
import { GRID_SIZE } from '../core/constants';

interface CanvasGridProps {
  showGrid: boolean;
  color?: string;
}

export function CanvasGrid({ showGrid, color }: CanvasGridProps) {
  if (!showGrid) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ opacity: 0.1, color: color || 'currentColor' }}>
      <defs>
        <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

