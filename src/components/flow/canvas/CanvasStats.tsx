/**
 * HeySure AI - 流程画布统计组件
 * 显示当前画布的节点和连接数量：
 * - 节点数量统计
 * - 连接（边）数量统计
 * - 悬浮在画布右下角显示
 */
// ============ 节点数量统计组件 ============
interface CanvasStatsProps {
  nodeCount: number;
  edgeCount: number;
}

export function CanvasStats({ nodeCount, edgeCount }: CanvasStatsProps) {
  return (
    <div className="absolute bottom-4 right-40 z-10 bg-background/95 backdrop-blur-sm border rounded-lg shadow-sm px-3 py-1.5 text-xs text-muted-foreground">
      节点: {nodeCount} | 连接: {edgeCount}
    </div>
  );
}

