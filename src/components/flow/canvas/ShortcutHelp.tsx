/**
 * HeySure AI - 流程快捷键帮助组件
 * 显示流程编辑模式的快捷键提示和操作指南：
 * - 常用快捷键列表（添加节点、删除、撤销、重做、框选等）
 * - 节点和连接数量统计
 * - 连接状态提示（正在连接时显示）
 * - 悬停展开详细说明
 */
import { useState } from 'react';
import { Info, ChevronUp, ChevronDown } from 'lucide-react';
import type { ThemeConfig } from '@/types/theme';

// ============ 快捷键说明组件 ============
interface ShortcutHelpProps {
  nodeCount?: number;
  edgeCount?: number;
  connectionVisible?: boolean;
  theme?: ThemeConfig;
}

export function ShortcutHelp({ nodeCount = 0, edgeCount = 0, connectionVisible = false, theme }: ShortcutHelpProps) {
  const [isHovered, setIsHovered] = useState(false);

  const containerStyle = theme ? {
    backgroundColor: theme.backgroundColor,
    borderColor: theme.gridColor,
    color: theme.textColor
  } : undefined;

  const triggerStyle = theme ? {
    backgroundColor: isHovered ? theme.nodeBackgroundColor : theme.backgroundColor,
    borderColor: theme.nodeBorderColor,
    color: theme.textColor
  } : undefined;

  return (
    <>
      {/* 连接状态提示（当正在连接时显示） - 居中显示 */}
      {connectionVisible && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/90 text-white text-sm rounded-lg shadow-md animate-in fade-in slide-in-from-bottom-2 pointer-events-auto">
            <span className="animate-pulse">●</span>
            <span>点击输入端口完成连接，或按 Esc 取消</span>
          </div>
        </div>
      )}

      {/* 操作提示 - 左下角 */}
      <div 
        className="absolute bottom-4 left-4 z-50 flex flex-col items-start pointer-events-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 展开的内容区域 - 向上展开 */}
        <div className={`
          absolute bottom-full left-0 mb-2 origin-bottom-left
          transform transition-all duration-200 ease-out
          ${isHovered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}
        `}>
          <div 
            className="bg-background/95 backdrop-blur-md border rounded-lg shadow-xl p-4 min-w-[800px]"
            style={containerStyle}
          >
            <div 
              className="flex items-center gap-2 border-b pb-3 mb-3 text-primary"
              style={{ borderColor: theme?.gridColor, color: theme?.textColor }}
            >
              <Info size={16} />
              <span className="font-medium text-sm">操作说明</span>
            </div>

            <div className="grid grid-cols-4 gap-6">
              {/* 节点操作 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-1" style={{ color: theme?.textColor }}>节点操作</div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>移动</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[2rem] text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>拖拽</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>删除</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[2rem] text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>Del</kbd>
                </div>
              </div>

              {/* 剪贴板操作 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-1" style={{ color: theme?.textColor }}>剪贴板操作</div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>复制</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[3rem] text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>Ctrl+C</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>剪切</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[3rem] text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>Ctrl+X</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>粘贴</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[3rem] text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>Ctrl+V</kbd>
                </div>
              </div>

              {/* 连接操作 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-1" style={{ color: theme?.textColor }}>连接操作</div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>开始连接</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>点击输出</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>完成连接</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>点击输入</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>取消</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[2rem] text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>Esc</kbd>
                </div>
              </div>

              {/* 画布操作 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-1" style={{ color: theme?.textColor }}>画布操作</div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>保存</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[3rem] text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>Ctrl+S</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>平移</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>左键拖拽</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>缩放</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>滚轮</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80" style={{ color: theme?.textColor }}>撤销/重做</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans text-center" style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>Ctrl+Z/Y</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 触发标签 */}
        <div 
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm cursor-pointer transition-all duration-200
            ${isHovered 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-background/80 backdrop-blur-sm hover:bg-background hover:shadow-md'
            }
          `}
          style={triggerStyle}
        >
          <Info size={14} className={isHovered ? 'animate-pulse' : ''} />
          <span className="text-xs font-medium">操作提示</span>
          {isHovered ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </div>

      {/* 右下角：统计信息 */}
      <div 
        className="absolute bottom-4 right-4 z-40 pointer-events-auto bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md border shadow-sm text-xs text-muted-foreground font-medium flex gap-3"
        onMouseDown={(e) => e.stopPropagation()}
        style={containerStyle}
      >
        <span style={{ color: theme?.textColor }}>节点: {nodeCount}</span>
        <span className="text-border" style={{ color: theme?.gridColor }}>|</span>
        <span style={{ color: theme?.textColor }}>连接: {edgeCount}</span>
      </div>
    </>
  );
}
