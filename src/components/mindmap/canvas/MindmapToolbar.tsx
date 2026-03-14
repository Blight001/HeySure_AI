/**
 * HeySure AI - 思维导图工具栏组件
 * 提供思维导图的常用操作按钮，包括：
 * - 节点操作：添加子节点、删除选中节点
 * - 视图控制：放大、缩小、适应画布
 * - 历史操作：撤销、重做
 * - 显示设置：切换节点内容显示/折叠
 * - AI 对话：打开 AI 辅助浮窗
 * - 主题颜色选择
 */
import React from 'react';
import { 
  Plus, Trash2, RefreshCw, ZoomIn, ZoomOut, 
  Undo, Redo, Palette, WrapText, MessageSquare 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ThemeConfig } from '@/types/theme';

interface MindmapToolbarProps {
  currentTheme: ThemeConfig;
  selectedNodeId: string | null;
  showColorPicker: string | null;
  scale: number;
  showFullContent: boolean;
  canUndo: boolean;
  canRedo: boolean;
  
  onAddChild: () => void;
  onAddProcessTrigger?: () => void;
  onDeleteNode: () => void;
  onShowColorPicker: (id: string | null) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRelayout: () => void;
  onToggleFullContent: (show: boolean) => void;
  onOpenAiChat?: () => void;
}

export const MindmapToolbar: React.FC<MindmapToolbarProps> = ({
  currentTheme,
  selectedNodeId,
  showColorPicker,
  scale,
  showFullContent,
  canUndo,
  canRedo,
  onAddChild,
  onAddProcessTrigger,
  onDeleteNode,
  onShowColorPicker,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onRelayout,
  onToggleFullContent,
  onOpenAiChat
}) => {
  const buttonStyle = {
    color: currentTheme.textColor,
    borderColor: currentTheme.nodeBorderColor,
    backgroundColor: currentTheme.nodeBackgroundColor
  };

  return (
    <div 
      className="mindmap-toolbar absolute top-4 left-4 flex flex-row items-center gap-2 p-2 rounded-lg shadow-lg border z-10 transition-all duration-200 hover:shadow-xl"
      style={{ 
        backgroundColor: currentTheme.backgroundColor, 
        borderColor: currentTheme.gridColor 
      }}
    >
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" style={{ backgroundColor: currentTheme.gridColor }} />
      
      <div className="toolbar-group flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onAddChild} disabled={!selectedNodeId} title="添加子节点" style={buttonStyle} className="h-8 w-8 p-0"><Plus size={16} /></Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddProcessTrigger} 
          disabled={!selectedNodeId} 
          title="添加流程触发节点" 
          style={{ ...buttonStyle, background: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)', color: 'white', border: 'none' }} 
          className="h-8 w-8 p-0"
        >
          <Plus size={16} />
        </Button>
        <Button variant="outline" size="sm" onClick={onDeleteNode} disabled={!selectedNodeId} title="删除节点" style={buttonStyle} className="h-8 w-8 p-0"><Trash2 size={16} /></Button>
        <Button variant="outline" size="sm" onClick={() => onShowColorPicker(showColorPicker === selectedNodeId ? null : selectedNodeId)} disabled={!selectedNodeId} title="更改颜色" style={buttonStyle} className="h-8 w-8 p-0"><Palette size={16} /></Button>
      </div>
      
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" style={{ backgroundColor: currentTheme.gridColor }} />
      
      <div className="toolbar-group flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo} title="撤销" style={buttonStyle} className="h-8 w-8 p-0"><Undo size={16} /></Button>
        <Button variant="outline" size="sm" onClick={onRedo} disabled={!canRedo} title="重做" style={buttonStyle} className="h-8 w-8 p-0"><Redo size={16} /></Button>
      </div>
      
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" style={{ backgroundColor: currentTheme.gridColor }} />
      
      <div className="toolbar-group flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onZoomIn} title="放大" style={buttonStyle} className="h-8 w-8 p-0"><ZoomIn size={16} /></Button>
        <div className="text-xs w-12 text-center select-none" style={{ color: currentTheme.textColor }}>{Math.round(scale * 100)}%</div>
        <Button variant="outline" size="sm" onClick={onZoomOut} title="缩小" style={buttonStyle} className="h-8 w-8 p-0"><ZoomOut size={16} /></Button>
        <Button variant="outline" size="sm" onClick={onRelayout} title="整理布局" style={buttonStyle} className="h-8 w-8 p-0"><RefreshCw size={16} /></Button>
      </div>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" style={{ backgroundColor: currentTheme.gridColor }} />

      <div className="toolbar-group flex items-center gap-1">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onToggleFullContent(!showFullContent)} 
          title={showFullContent ? "收起节点内容" : "显示完整内容"} 
          style={{ ...buttonStyle, backgroundColor: showFullContent ? currentTheme.nodeBorderColor : currentTheme.nodeBackgroundColor }} 
          className="h-8 w-8 p-0"
        >
          <WrapText size={16} />
        </Button>
        {onOpenAiChat && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOpenAiChat} 
            title="AI 助手" 
            style={{ ...buttonStyle, color: '#8b5cf6' }} 
            className="h-8 w-8 p-0"
          >
            <MessageSquare size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};
