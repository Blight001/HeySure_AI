/**
 * HeySure AI - 窗口标题栏组件
 * 自定义窗口标题栏，提供原生窗口控制功能：
 * - 显示应用 Logo 和名称
 * - 最小化、最大化/还原、关闭按钮
 * - 监听窗口状态变化
 * - 双击标题栏最大化/还原
 */
import { useEffect, useState } from 'react';
import {
  Minus,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/utils/helpers';

interface WindowTitleBarProps {
  className?: string;
}

export function WindowTitleBar({ className }: WindowTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isHovering, setIsHovering] = useState<string | null>(null);

  useEffect(() => {
    // 检查初始最大化状态
    const checkMaximized = async () => {
      try {
        const maximized = await window.ipcRenderer.invoke('window:isMaximized');
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to check maximized state:', error);
      }
    };
    checkMaximized();

    // 监听最大化状态变化
    const handleMaximizeState = (_event: Event, maximized: boolean) => {
      setIsMaximized(maximized);
    };

    window.ipcRenderer.on('window:maximizeState', handleMaximizeState);

    return () => {
      window.ipcRenderer.off('window:maximizeState', handleMaximizeState);
    };
  }, []);

  const handleMinimize = () => {
    window.ipcRenderer.invoke('window:minimize');
  };

  const handleMaximize = () => {
    window.ipcRenderer.invoke('window:maximize');
  };

  const handleClose = () => {
    window.ipcRenderer.invoke('window:close');
  };

  return (
    <div
      className={cn(
        'flex h-12 items-center justify-between bg-background border-b px-4 select-none',
        className
      )}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={handleMaximize}
    >
      {/* 左侧：Logo 和应用名称 */}
      <div className="flex items-center gap-2 h-full">
        <img
          src="/image/logo.png"
          alt="HeySure AI Logo"
          className="h-9 w-9 object-contain flex-shrink-0"
        />
        <span className="font-semibold text-sm">HeySure AI</span>
      </div>

      {/* 右侧：窗口控制按钮 */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* 最小化按钮 */}
        <button
          className={cn(
            'group flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200',
            'hover:bg-muted',
            isHovering === 'minimize' && 'bg-muted'
          )}
          onMouseEnter={() => setIsHovering('minimize')}
          onMouseLeave={() => setIsHovering(null)}
          onClick={handleMinimize}
          title="最小化"
        >
          <Minus
            size={16}
            className={cn(
              'text-muted-foreground transition-colors',
              'group-hover:text-foreground'
            )}
          />
        </button>

        {/* 最大化/还原按钮 */}
        <button
          className={cn(
            'group flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200',
            'hover:bg-muted',
            isHovering === 'maximize' && 'bg-muted'
          )}
          onMouseEnter={() => setIsHovering('maximize')}
          onMouseLeave={() => setIsHovering(null)}
          onClick={handleMaximize}
          title={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? (
            <Minimize2
              size={14}
              className={cn(
                'text-muted-foreground transition-colors',
                'group-hover:text-foreground'
              )}
            />
          ) : (
            <Maximize2
              size={14}
              className={cn(
                'text-muted-foreground transition-colors',
                'group-hover:text-foreground'
              )}
            />
          )}
        </button>

        {/* 关闭按钮 */}
        <button
          className={cn(
            'group flex h-9 w-9 items-center justify-center rounded-md transition-all duration-200',
            'hover:bg-destructive hover:text-destructive-foreground',
            isHovering === 'close' && 'bg-destructive text-destructive-foreground'
          )}
          onMouseEnter={() => setIsHovering('close')}
          onMouseLeave={() => setIsHovering(null)}
          onClick={handleClose}
          title="关闭"
        >
          <X
            size={16}
            className={cn(
              'text-muted-foreground transition-colors',
              'group-hover:text-destructive-foreground'
            )}
          />
        </button>
      </div>
    </div>
  );
}

