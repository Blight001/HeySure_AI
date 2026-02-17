/**
 * HeySure AI - 简单触发按钮组件
 * 用于手动触发的简化节点：
 * - 单一的触发按钮
 * - 点击触发流程
 * - 触发动画反馈
 * - 主题颜色支持
 */
// ============ 简单触发按钮组件 ============
import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ThemeConfig } from '@/types/theme';

interface SimpleTriggerButtonProps {
  label?: string;
  onTrigger?: () => void;
  theme?: ThemeConfig;
}

export function SimpleTriggerButton({
  label = '触发',
  onTrigger,
  theme
}: SimpleTriggerButtonProps) {
  const [isTriggering, setIsTriggering] = useState(false);

  const handleClick = async () => {
    setIsTriggering(true);
    try {
      await onTrigger?.();
    } finally {
      setTimeout(() => setIsTriggering(false), 300);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        className={`${
          isTriggering
            ? 'animate-pulse'
            : ''
        } ${!theme ? (isTriggering ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600') : ''}`}
        style={theme ? {
          backgroundColor: isTriggering ? theme.nodeBorderColor : theme.lineColor || '#3b82f6',
          color: '#fff',
          borderColor: theme.nodeBorderColor
        } : undefined}
        onClick={handleClick}
      >
        <Zap size={14} className="mr-1.5" />
        {isTriggering ? '已发送' : label}
      </Button>
      {isTriggering && (
        <span className="text-[10px] animate-pulse" style={{ color: theme ? theme.lineColor : '#16a34a' }}>信号输出</span>
      )}
    </div>
  );
}
