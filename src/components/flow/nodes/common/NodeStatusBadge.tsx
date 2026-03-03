
import { cn } from '@/utils/helpers';
import { Badge } from '@/components/ui/badge';
import React from 'react';

export interface NodeStatusBadgeProps {
  status: string;
  className?: string;
  labels?: Record<string, string>;
  colors?: Record<string, string>;
}

const DEFAULT_LABELS: Record<string, string> = {
  running: "运行中",
  completed: "完成",
  error: "错误",
  paused: "暂停",
  idle: "就绪",
  // AI 节点状态
  generating: "生成中",
  thinking: "思考中",
};

const DEFAULT_COLORS: Record<string, string> = {
  running: "bg-blue-500 border-blue-600 text-white animate-pulse",
  completed: "bg-green-500 border-green-600 text-white",
  error: "bg-red-500 border-red-600 text-white",
  paused: "bg-yellow-500 border-yellow-600 text-white",
  idle: "text-muted-foreground border-border bg-muted",
  // AI 节点状态
  generating: "bg-purple-500 border-purple-600 text-white animate-pulse",
  thinking: "bg-indigo-500 border-indigo-600 text-white animate-pulse",
};

export function NodeStatusBadge({ status, className, labels = {}, colors = {} }: NodeStatusBadgeProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const mergedColors = { ...DEFAULT_COLORS, ...colors };
  
  // 处理未定义状态
  const label = mergedLabels[status] || status;
  const colorClass = mergedColors[status] || mergedColors.idle;

  return (
    <Badge 
      variant="outline" 
      className={cn("text-[10px] h-4 px-1 py-0 font-normal whitespace-nowrap", colorClass, className)}
    >
      {label}
    </Badge>
  );
}
