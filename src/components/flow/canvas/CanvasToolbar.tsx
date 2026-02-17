/**
 * HeySure AI - 流程画布工具栏组件
 * 提供流程编辑的常用操作按钮，包括：
 * - 视图控制：撤销、重做、放大、缩小、适应画布
 * - 动画速度控制
 * - 节点面板（基础节点、AI节点、逻辑节点、Python节点、控制节点）
 * - AI 对话浮窗入口
 * - 拖拽添加节点功能
 */
// ============ 画布工具栏组件 ============
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Undo, Redo, ZoomIn, ZoomOut, MousePointer2, Zap, MessageSquare, Plus
} from 'lucide-react';
import { BasicNodePalette } from '../sidebar/BasicNodePalette';
import { LogicNodePalette } from '../sidebar/LogicNodePalette';
import { AINodePalette } from '../sidebar/AINodePalette';
import { PythonNodePalette } from '../sidebar/PythonNodePalette';
import { ControlNodePalette } from '../sidebar/ControlNodePalette';
import type { ModelConfig } from '../core/types';
import type { PythonComponent, PythonScriptConfig } from '@/types/flow';
import type { DragData } from '../core/types';
import type { ThemeConfig } from '@/types/theme';

interface CanvasToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  animationSpeed: number;
  connectionStrokeWidth: number;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onOpenChat: () => void;
  onSpeedChange: (speed: number) => void;
  onConnectionStrokeWidthChange: (width: number) => void;

  // Node Palette Props
  models: ModelConfig[];
  scripts: PythonScriptConfig[];
  scriptComponents: PythonComponent[];
  isRefreshing: boolean;
  onRefreshScripts: () => void;
  onAddScript: () => void;
  onOpenScriptManager: () => void;
  onEditScript: (script: PythonScriptConfig) => void;
  onDeleteScript: (scriptId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onModelConfig: (model: ModelConfig) => void;
  onAddModelNode: (model: ModelConfig) => void;
  onAddPythonNode: (component: PythonComponent) => void;
  onDragStart: (e: React.DragEvent, data: DragData) => void;
  theme?: ThemeConfig;
}

export function CanvasToolbar({
  canUndo,
  canRedo,
  zoom,
  animationSpeed,
  connectionStrokeWidth,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetView,
  onOpenChat,
  onSpeedChange,
  onConnectionStrokeWidthChange,
  models,
  scripts,
  scriptComponents,
  isRefreshing,
  onRefreshScripts,
  onAddScript,
  onOpenScriptManager,
  onEditScript,
  onDeleteScript,
  onDeleteComponent,
  onModelConfig,
  onAddModelNode,
  onAddPythonNode,
  onDragStart,
  theme
}: CanvasToolbarProps) {
  const toolbarStyle = theme ? {
    backgroundColor: theme.backgroundColor,
    borderColor: theme.gridColor,
    color: theme.textColor
  } : undefined;

  return (
    <div 
      data-canvas-toolbar 
      className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-background/95 backdrop-blur-sm border rounded-lg shadow-sm p-1 transition-colors duration-300"
      onMouseDown={(e) => e.stopPropagation()}
      style={toolbarStyle}
    >
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="添加节点">
            <Plus size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-64 max-h-[80vh] overflow-y-auto p-2" 
          sideOffset={10}
          onMouseDown={(e) => e.stopPropagation()}
          data-canvas-ignore="true"
        >
          <BasicNodePalette onDragStart={onDragStart} />
          <DropdownMenuSeparator />
          <LogicNodePalette onDragStart={onDragStart} />
          <DropdownMenuSeparator />
          <ControlNodePalette onDragStart={onDragStart} />
          <DropdownMenuSeparator />
          <AINodePalette
            models={models}
            onModelConfig={onModelConfig}
            onAddNode={onAddModelNode}
            onDragStart={onDragStart}
          />
          <DropdownMenuSeparator />
          <PythonNodePalette
            scripts={scripts}
            scriptComponents={scriptComponents}
            isRefreshing={isRefreshing}
            onRefresh={onRefreshScripts}
            onAddScript={onAddScript}
            onOpenManager={onOpenScriptManager}
            onEditScript={onEditScript}
            onDeleteScript={onDeleteScript}
            onDeleteComponent={onDeleteComponent}
            onAddNodeToCanvas={onAddPythonNode}
            onDragStart={onDragStart}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      
      <div className="w-px h-6 bg-border mx-1" style={{ backgroundColor: theme?.gridColor }} />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
      >
        <Undo size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onRedo}
        disabled={!canRedo}
        title="重做 (Ctrl+Y)"
      >
        <Redo size={16} />
      </Button>
      <div className="w-px h-6 bg-border mx-1" style={{ backgroundColor: theme?.gridColor }} />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomOut}
        title="缩小"
      >
        <ZoomOut size={16} />
      </Button>
      <span className="text-xs w-12 text-center select-none">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomIn}
        title="放大"
      >
        <ZoomIn size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onResetView}
        title="重置视图"
      >
        <MousePointer2 size={16} />
      </Button>

      <div className="w-px h-6 bg-border mx-1" style={{ backgroundColor: theme?.gridColor }} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="动画速度">
            <Zap size={16} className={animationSpeed < 1 ? "text-yellow-500 fill-yellow-500" : ""} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onSpeedChange(2.0)}>
            <span className="w-4 mr-2">{animationSpeed === 2.0 && "✓"}</span> 🐢 慢速 (2.0s)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSpeedChange(1.0)}>
            <span className="w-4 mr-2">{animationSpeed === 1.0 && "✓"}</span> 🚶 正常 (1.0s)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSpeedChange(0.3)}>
            <span className="w-4 mr-2">{animationSpeed === 0.3 && "✓"}</span> 🏃 快速 (0.3s)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSpeedChange(0.01)}>
            <span className="w-4 mr-2">{animationSpeed === 0.01 && "✓"}</span> ⚡ 极速 (0.01s)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" title="连线粗细">
            线宽 {connectionStrokeWidth}px
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {[1, 2, 3, 4, 6].map((width) => (
            <DropdownMenuItem key={width} onClick={() => onConnectionStrokeWidthChange(width)}>
              <span className="w-4 mr-2">{connectionStrokeWidth === width && "✓"}</span>
              {width}px
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="打开AI聊天"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChat();
        }}
      >
        <MessageSquare size={16} />
      </Button>

    </div>
  );
}
