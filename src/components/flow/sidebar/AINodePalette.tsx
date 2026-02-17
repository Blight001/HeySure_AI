/**
 * HeySure AI - AI 节点面板组件
 * 流程编辑器侧边栏中的 AI 节点分类：
 * - 可用的 AI 模型列表
 * - 添加 AI 节点到画布
 * - 模型配置管理入口
 * - 拖拽添加 AI 节点
 */
// ============ AI节点面板组件 ============
import { useState } from 'react';
import { MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ModelConfig } from '../core/types';
import type { DragData } from '../core/types';
import type { FlowNode } from '@/types/flow';

interface AINodePaletteProps {
  models: ModelConfig[];
  onModelConfig?: (model: ModelConfig) => void;
  onAddNode?: (model: ModelConfig) => void;
  onDragStart?: (e: React.DragEvent, data: DragData) => void;
}

export function AINodePalette({
  models,
  onModelConfig,
  onAddNode,
  onDragStart: externalDragStart
}: AINodePaletteProps) {
  const [expanded, setExpanded] = useState(true);
  const handleDragStart = (e: React.DragEvent, data: DragData) => {
    if (externalDragStart) {
      externalDragStart(e, data);
    }
  };

  if (models.length === 0) {
    return (
      <>
        <button
          type="button"
          className="text-xs text-muted-foreground px-2 py-1 mt-4 flex items-center gap-1 w-full"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>AI 节点</span>
        </button>
        {expanded && (
          <div className="px-3 py-2 text-sm text-muted-foreground italic">
            暂无启用模型
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="text-xs text-muted-foreground px-2 py-1 mt-4 flex items-center gap-1 w-full"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>AI 节点</span>
      </button>
      {expanded && models.map((model) => (
        <div key={model.id} className="relative group">
          <div
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
            draggable
            title={model.model}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => handleDragStart(e, {
              type: 'model',
              model,
              label: model.name,
              icon: '🤖'
            })}
            onClick={(e) => {
              // 如果点击的是配置按钮，忽略（配置按钮有自己的处理）
              if ((e.target as HTMLElement).closest('.model-config-btn')) {
                return;
              }
              // 单击添加到画布
              onAddNode?.(model);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              // 双击弹出配置对话框
              onModelConfig?.(model);
            }}
          >
            <span>🤖</span>
            <span className="truncate flex-1">{model.name}</span>
            <div
              title="配置模型"
              role="button"
              tabIndex={0}
              className="model-config-btn opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onModelConfig?.(model);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onModelConfig?.(model);
                }
              }}
            >
              <MoreHorizontal size={14} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

