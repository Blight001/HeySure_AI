/**
 * HeySure AI - 逻辑节点面板组件
 * 流程编辑器侧边栏中的逻辑节点分类：
 * - 条件分支节点
 * - 并行执行节点
 * - 聚合汇总节点
 * - 可展开/折叠的面板
 */
// ============ 逻辑节点面板组件 ============
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DragData } from '../core/types';

const LOGIC_NODES: { type: 'condition' | 'parallel' | 'aggregate'; label: string; icon: string }[] = [
  { type: 'condition', label: '条件分支', icon: '🔀' },
  { type: 'parallel', label: '并行执行', icon: '⚡' },
  { type: 'aggregate', label: '聚合汇总', icon: '📥' },
];

interface LogicNodePaletteProps {
  onDragStart?: (e: React.DragEvent, data: DragData) => void;
}

export function LogicNodePalette({ onDragStart: externalDragStart }: LogicNodePaletteProps) {
  const [expanded, setExpanded] = useState(true);
  const handleDragStart = (e: React.DragEvent, data: DragData) => {
    if (externalDragStart) {
      externalDragStart(e, data);
    }
  };

  return (
    <>
      <button
        type="button"
        className="text-xs text-muted-foreground px-2 py-1 mt-4 flex items-center gap-1 w-full"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>逻辑节点</span>
      </button>
      {expanded && LOGIC_NODES.map((node) => (
        <button
          key={node.type}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
          draggable
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => handleDragStart(e, {
            type: node.type,
            label: node.label,
            icon: node.icon
          })}
        >
          <span>{node.icon}</span>
          <span>{node.label}</span>
        </button>
      ))}
    </>
  );
}

