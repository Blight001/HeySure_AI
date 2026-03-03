/**
 * HeySure AI - 思维导图快捷键帮助组件
 * 显示思维导图模式的快捷键提示和操作指南：
 * - 常用快捷键列表（添加节点、删除、撤销、重做等）
 * - 节点数量统计
 * - 悬停展开详细说明
 */
import { useState } from 'react';
import { Info, ChevronUp, ChevronDown } from 'lucide-react';

// ============ 思维导图快捷键说明组件 ============
interface MindmapShortcutHelpProps {
  nodeCount?: number;
}

export function MindmapShortcutHelp({ nodeCount = 0 }: MindmapShortcutHelpProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
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
          <div className="bg-background/95 backdrop-blur-md border rounded-lg shadow-xl p-4 min-w-[600px]">
            <div className="flex items-center gap-2 border-b pb-3 mb-3 text-primary">
              <Info size={16} />
              <span className="font-medium text-sm">操作说明</span>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* 节点操作 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">节点操作</div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">添加子节点</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[2rem] text-center">Tab</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">添加兄弟节点</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[2rem] text-center">Enter</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">添加流程触发节点</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[2rem] text-center">Ctrl+Tab</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">编辑内容</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[2rem] text-center">Space</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">删除节点</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[2rem] text-center">Del</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">取消/退出</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[2rem] text-center">Esc</kbd>
                </div>
              </div>

              {/* 剪贴板操作 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">剪贴板操作</div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">复制</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[3rem] text-center">Ctrl+C</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">剪切</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[3rem] text-center">Ctrl+X</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">粘贴</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[3rem] text-center">Ctrl+V</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">撤销</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[3rem] text-center">Ctrl+Z</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">重做</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans min-w-[3rem] text-center">Ctrl+Y</kbd>
                </div>
              </div>

              {/* 画布操作 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">画布操作</div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">平移</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans text-center">左键拖拽</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">缩放</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans text-center">滚轮</kbd>
                </div>
                <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">同名节点切换</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans text-center">Ctrl+滚轮</kbd>
                </div>
                 <div className="flex justify-between text-xs items-center gap-4">
                  <span className="text-muted-foreground/80">导航</span>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded border text-foreground font-sans text-center">方向键</kbd>
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
      >
        <span>节点: {nodeCount}</span>
      </div>
    </>
  );
}
