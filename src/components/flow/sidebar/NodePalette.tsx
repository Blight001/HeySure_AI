/**
 * HeySure AI - 流程节点面板容器组件
 * 整合所有类型的节点面板：
 * - 基础节点面板
 * - AI 节点面板
 * - 逻辑节点面板
 * - Python 节点面板
 * - 控制节点面板
 * - 脚本刷新和管理器入口
 */
// ============ 节点面板组件 ============
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BasicNodePalette } from './BasicNodePalette';
import { AINodePalette } from './AINodePalette';
import { PythonNodePalette } from './PythonNodePalette';
import { ControlNodePalette } from './ControlNodePalette';
import type { ModelConfig } from '../core/types';
import type { PythonComponent, PythonScriptConfig } from '@/types/flow';
import type { DragData } from '../core/types';

interface NodePaletteProps {
  models: ModelConfig[];
  scripts: PythonScriptConfig[];
  scriptComponents: PythonComponent[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onAddScript: () => void;
  onOpenManager: () => void;
  onEditScript: (script: PythonScriptConfig) => void;
  onDeleteScript: (scriptId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onModelConfig?: (model: ModelConfig) => void;
  onAddModelNode?: (model: ModelConfig) => void;
  onAddPythonNode: (component: PythonComponent) => void;
  onDragStart?: (e: React.DragEvent, data: DragData) => void;
}

export function NodePalette({
  models,
  scripts,
  scriptComponents,
  isRefreshing,
  onRefresh,
  onAddScript,
  onOpenManager,
  onEditScript,
  onDeleteScript,
  onDeleteComponent,
  onModelConfig,
  onAddModelNode,
  onAddPythonNode,
  onDragStart
}: NodePaletteProps) {
  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <h3 className="font-medium">节点组件</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="刷新组件列表"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* 可滚动区域 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        <BasicNodePalette onDragStart={onDragStart} />
        <ControlNodePalette onDragStart={onDragStart} />
        <AINodePalette
          models={models}
          onModelConfig={onModelConfig}
          onAddNode={onAddModelNode}
          onDragStart={onDragStart}
        />
        <PythonNodePalette
          scripts={scripts}
          scriptComponents={scriptComponents}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          onAddScript={onAddScript}
          onOpenManager={onOpenManager}
          onEditScript={onEditScript}
          onDeleteScript={onDeleteScript}
          onDeleteComponent={onDeleteComponent}
          onAddNodeToCanvas={onAddPythonNode}
          onDragStart={onDragStart}
        />
      </div>
    </aside>
  );
}

