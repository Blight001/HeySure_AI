/**
 * HeySure AI - 流程连接线组件
 * 渲染单个流程节点之间的连接线：
 * - 贝塞尔曲线连接样式
 * - 连接点击删除功能
 * - 连接高亮状态显示
 * - SVG 路径渲染
 */
// ============ 连接线组件 ============
import type { FlowEdge, FlowNode } from '@/types/flow';

interface ConnectionLineProps {
  edge: FlowEdge;
  sourceNode: FlowNode;
  targetNode: FlowNode | undefined;
  onDelete?: (edgeId: string) => void;
}

export function ConnectionLine({ edge, sourceNode, targetNode, onDelete }: ConnectionLineProps) {
  if (!targetNode) return null;

  const sourceX = sourceNode.position.x + 150; // 节点右侧
  const sourceY = sourceNode.position.y + 60; // 中间位置
  const targetX = targetNode.position.x; // 节点左侧
  const targetY = targetNode.position.y + 60;

  // 贝塞尔曲线
  const controlOffset = Math.abs(targetX - sourceX) * 0.5;
  const pathD = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;

  return (
    <g className="pointer-events-auto">
      <path
        d={pathD}
        stroke={edge.style?.stroke || '#64748b'}
        strokeWidth={edge.style?.strokeWidth || 2}
        fill="none"
        className="cursor-pointer hover:stroke-red-500 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('确定删除此连接线？')) {
            onDelete?.(edge.id);
          }
        }}
      />
      {/* 连接点圆圈 */}
      <circle cx={sourceX} cy={sourceY} r={3} fill="#64748b" />
      <circle cx={targetX} cy={targetY} r={3} fill="#64748b" />
    </g>
  );
}

