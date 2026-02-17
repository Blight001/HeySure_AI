/**
 * HeySure AI - 控制节点面板组件
 * 流程编辑器侧边栏中的控制节点分类：
 * - 开关节点（信号门控）
 * - 触发器节点（手动/定时触发）
 * - 简单的触发按钮
 * - 可展开/折叠的面板
 */
// ============ 控制节点面板组件 ============
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useDragData } from '../hooks';
import type { DragData } from '../core/types';
import type { FlowNodeType } from '@/types/flow';
import { NodePaletteItem } from './NodePaletteItem';

const CONTROL_NODES: { type: FlowNodeType; label: string; icon: string; description: string }[] = [
  {
    type: 'switch',
    label: '开关',
    icon: '🔌',
    description: '暂存信号，开启后发送'
  },
  {
    type: 'trigger',
    label: '触发器',
    icon: '🧲',
    description: '手动触发发送信号'
  },
  {
    type: 'simpleTrigger',
    label: '按钮',
    icon: '⚡',
    description: '简单按钮，点击发送信号'
  },
];

interface ControlNodePaletteProps {
  onDragStart?: (e: React.DragEvent, data: DragData) => void;
}

export function ControlNodePalette({ onDragStart: externalDragStart }: ControlNodePaletteProps) {
  const [expanded, setExpanded] = useState(true);
  const { handleDragStart } = useDragData();

  const handleStart = (e: React.DragEvent, data: DragData) => {
    if (externalDragStart) {
      externalDragStart(e, data);
    } else {
      handleDragStart(e, data);
    }
  };

  return (
    <>
      <button
        type="button"
        className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-1 w-full"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>控制节点</span>
      </button>
      {expanded && CONTROL_NODES.map((node) => (
        <NodePaletteItem
          key={node.type}
          type={node.type}
          label={node.label}
          icon={node.icon}
          description={node.description}
          onDragStart={handleStart}
        />
      ))}
    </>
  );
}

