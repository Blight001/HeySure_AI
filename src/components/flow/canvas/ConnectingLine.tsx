/**
 * HeySure AI - 正在连接的线组件
 * 渲染节点连接过程中的临时连接线：
 * - 从源节点连接到鼠标位置
 * - 实时跟随鼠标移动
 * - 直线样式显示
 * - 蓝色高亮表示正在连接状态
 */
// ============ 正在连接的线组件 ============
import type { FlowNode } from '@/types/flow';

interface ConnectingLineProps {
  sourceNode: FlowNode;
  mouseX: number;
  mouseY: number;
}

export function ConnectingLine({ sourceNode, mouseX, mouseY }: ConnectingLineProps) {
  const sourceX = sourceNode.position.x + 150;
  const sourceY = sourceNode.position.y + 60;

  const pathD = `M ${sourceX} ${sourceY} L ${mouseX} ${mouseY}`;

  return (
    <path
      d={pathD}
      stroke="#3b82f6"
      strokeWidth={2}
      strokeDasharray="5,5"
      fill="none"
      className="pointer-events-none"
    />
  );
}

