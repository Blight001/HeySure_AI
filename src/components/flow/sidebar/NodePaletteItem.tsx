/**
 * HeySure AI - 节点类型面板项组件
 * 节点面板中的单个可拖拽节点项：
 * - 节点图标和标签显示
 * - 节点描述信息
 * - 拖拽功能实现
 * - Tooltip 悬浮提示
 */
// ============ 节点类型面板项组件 ============
import type { FlowNodeType } from '@/types/flow';
import type { DragData } from '../core/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NodePaletteItemProps {
  type: FlowNodeType;
  dragType?: DragData['type'];
  label: string;
  icon: string;
  description?: string;  // 可选描述
  onDragStart: (e: React.DragEvent, data: DragData) => void;
}

export function NodePaletteItem({
  type,
  dragType,
  label,
  icon,
  description,
  onDragStart
}: NodePaletteItemProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
            draggable
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => onDragStart(e, {
              type: dragType || 'basic', // 默认为 basic，因为目前只有基础节点使用此组件
              nodeType: type,
              label,
              icon
            })}
          >
            <span>{icon}</span>
            <span className="flex-1 text-left">{label}</span>
          </button>
        </TooltipTrigger>
        {description && (
          <TooltipContent side="right" className="max-w-xs">
            <p>{description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
