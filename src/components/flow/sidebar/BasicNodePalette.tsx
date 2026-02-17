/**
 * HeySure AI - 基础节点面板组件
 * 流程编辑器侧边栏中的基础节点分类：
 * - 开始节点
 * - 结束节点
 * - 用户输入节点
 * - 文本显示节点
 * - 可展开/折叠的面板
 */
// ============ 基础节点面板组件 ============
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useDragData } from '../hooks';
import type { DragData } from '../core/types';
import type { FlowNodeType } from '@/types/flow';
import { NodePaletteItem } from './NodePaletteItem';

const BASIC_NODES: { type: FlowNodeType; label: string; icon: string }[] = [
  { type: 'start', label: '开始', icon: '🟢' },
  { type: 'end', label: '结束', icon: '🔴' },
  { type: 'userInput', label: '用户输入', icon: '👤' },
  { type: 'textDisplay', label: '文本显示', icon: '📄' },
];

interface BasicNodePaletteProps {
  onDragStart?: (e: React.DragEvent, data: DragData) => void;
}

export function BasicNodePalette({ onDragStart: externalDragStart }: BasicNodePaletteProps) {
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
        <span>基础节点</span>
      </button>
      {expanded && BASIC_NODES.map((node) => (
        <NodePaletteItem
          key={node.type}
          type={node.type}
          label={node.label}
          icon={node.icon}
          onDragStart={handleStart}
        />
      ))}
    </>
  );
}

