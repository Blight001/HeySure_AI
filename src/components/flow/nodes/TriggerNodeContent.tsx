/**
 * HeySure AI - 触发器节点内容组件
 * 用于触发流程执行的节点：
 * - 手动触发模式
 * - 定时触发模式（定时间隔）
 * - 运行/暂停/停止控制
 * - 定时器状态显示
 * - 触发次数统计
 */
// ============ 触发器节点内容组件 ============
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Clock, Zap, Play, Pause, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ThemeConfig } from '@/types/theme';

// 触发器配置
export interface TriggerConfig {
  triggerType: 'manual' | 'scheduled';  // 触发类型
  scheduleInterval?: number;             // 定时间隔（秒）
}

// 定时器状态
type TimerStatus = 'idle' | 'running' | 'paused';

// 触发器节点数据
interface TriggerNodeData {
  label?: string;
  triggerType?: 'manual' | 'scheduled';
  scheduleInterval?: number;
  triggerCount?: number;
  lastTriggerTime?: string;
  isTriggering?: boolean;
  timerStatus?: TimerStatus;            // 定时器状态
  lastTriggerTimestamp?: number;        // 最后触发时间戳（毫秒）
  remainingTime?: number;               // 剩余触发时间（毫秒）
}

// 触发器节点属性
interface TriggerNodeContentProps {
  data: TriggerNodeData;
  onTrigger?: () => void;
  onConfigChange?: (config: TriggerConfig) => void;
  onTimerStateChange?: (isRunning: boolean, interval: number) => void; // 定时器状态变化回调
  theme?: ThemeConfig;
}

export function TriggerNodeContent({
  data,
  onTrigger,
  onConfigChange,
  onTimerStateChange,
  theme
}: TriggerNodeContentProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef<number>(0);

  const triggerCount = data.triggerCount ?? 0;
  const lastTriggerTime = data.lastTriggerTime;
  const triggerType = data.triggerType || 'manual';
  const scheduleInterval = data.scheduleInterval || 5;
  const dataTimerStatus = data.timerStatus || 'idle';

  // 格式化时间显示
  const formatTime = useCallback((ms: number) => {
    if (ms <= 0) return '0:00';
    const seconds = Math.ceil(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 初始化剩余时间
  useEffect(() => {
    const intervalMs = scheduleInterval * 1000;
    if (data.lastTriggerTimestamp) {
      const elapsed = Date.now() - data.lastTriggerTimestamp;
      remainingRef.current = Math.max(0, intervalMs - elapsed);
      setRemainingTime(remainingRef.current);
    } else {
      remainingRef.current = intervalMs;
      setRemainingTime(intervalMs);
    }
  }, [scheduleInterval, data.lastTriggerTimestamp]);

  // 定时器主逻辑
  const startTimer = useCallback(() => {
    if (timerStatus === 'running') return;

    const intervalMs = scheduleInterval * 1000;
    if (remainingRef.current <= 0) {
      remainingRef.current = intervalMs;
    }

    setTimerStatus('running');
    onTimerStateChange?.(true, scheduleInterval);

    // 更新剩余时间的循环
    intervalRef.current = setInterval(() => {
      remainingRef.current -= 100;

      if (remainingRef.current <= 0) {
        // 触发时间到
        remainingRef.current = intervalMs;
        handleTrigger();
      }

      // 更新显示状态
      setRemainingTime(() => Math.max(0, remainingRef.current));
    }, 100);
  }, [scheduleInterval, timerStatus, onTimerStateChange]);

  // 暂停定时器
  const pauseTimer = useCallback(() => {
    if (timerStatus !== 'running') return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setTimerStatus('paused');
    onTimerStateChange?.(false, scheduleInterval);
  }, [timerStatus, scheduleInterval, onTimerStateChange]);

  // 停止并重置定时器
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    remainingRef.current = scheduleInterval * 1000;
    setRemainingTime(remainingRef.current);
    setTimerStatus('idle');
    onTimerStateChange?.(false, scheduleInterval);
  }, [scheduleInterval, onTimerStateChange]);

  // 切换定时器状态
  const toggleTimer = useCallback(() => {
    if (timerStatus === 'running') {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [timerStatus, startTimer, pauseTimer]);

  // 触发处理
  const handleTrigger = async () => {
    setIsTriggering(true);
    try {
      await onTrigger?.();
    } finally {
      setTimeout(() => setIsTriggering(false), 500);
    }
  };

  // 手动触发时重置定时器
  const handleManualTrigger = async () => {
    if (timerStatus === 'running') {
      // 重置倒计时
      remainingRef.current = scheduleInterval * 1000;
      setRemainingTime(remainingRef.current);
    }
    await handleTrigger();
  };

  // 监听外部状态变化
  useEffect(() => {
    if (dataTimerStatus !== timerStatus && dataTimerStatus === 'idle' && timerStatus === 'running') {
      // 外部要求停止
      stopTimer();
    }
  }, [dataTimerStatus]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 页面可见性变化处理（切到后台时暂停定时器）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && timerStatus === 'running') {
        pauseTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timerStatus]);

  // 窗口失去焦点时暂停定时器
  useEffect(() => {
    const handleBlur = () => {
      if (timerStatus === 'running') {
        pauseTimer();
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [timerStatus]);

  const handleToggleType = () => {
    const newType: 'manual' | 'scheduled' = triggerType === 'manual' ? 'scheduled' : 'manual';
    // 切换类型时先停止定时器
    if (triggerType === 'scheduled') {
      stopTimer();
    }
    onConfigChange?.({ triggerType: newType, scheduleInterval });
  };

  const handleIntervalChange = (delta: number) => {
    const newInterval = Math.max(1, Math.min(3600, scheduleInterval + delta));
    // 如果定时器正在运行，更新剩余时间
    if (timerStatus === 'running') {
      remainingRef.current = newInterval * 1000;
      setRemainingTime(remainingRef.current);
    }
    onConfigChange?.({ triggerType, scheduleInterval: newInterval });
  };

  // 获取定时器按钮状态样式
  const getTimerButtonClass = () => {
    switch (timerStatus) {
      case 'running':
        return 'bg-amber-500 hover:bg-amber-600 animate-pulse';
      case 'paused':
        return 'bg-orange-400 hover:bg-orange-500';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 min-w-[160px]" style={theme ? { color: theme.textColor } : undefined}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className={isTriggering ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'} style={!isTriggering && theme ? { color: theme.textColor } : undefined} />
          <span className="text-sm font-medium">{data.label || '触发器'}</span>
        </div>
        <Badge variant="outline" className="text-xs px-1.5 py-0" style={theme ? { borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}>
          {triggerType === 'manual' ? '手动' : '定时'}
        </Badge>
      </div>

      {triggerType === 'scheduled' && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground" style={theme ? { color: theme.textColor, opacity: 0.8 } : undefined}>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{scheduleInterval}s</span>
            </div>
            <span>{formatTime(remainingTime)}</span>
          </div>
          {/* 进度条背景 */}
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden" style={theme ? { backgroundColor: `${theme.nodeBorderColor}40` } : undefined}>
            <div 
              className="h-full bg-blue-500 transition-all duration-100 ease-linear"
              style={{ 
                width: `${Math.min(100, Math.max(0, (1 - remainingTime / (scheduleInterval * 1000)) * 100))}%`,
                ...(theme ? { backgroundColor: theme.lineColor } : {})
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {triggerType === 'manual' ? (
          <Button 
            size="sm" 
            className="w-full h-7 text-xs" 
            onClick={handleTrigger}
            disabled={isTriggering}
            style={theme ? { 
              backgroundColor: isTriggering ? theme.nodeBorderColor : theme.lineColor, 
              color: '#fff',
              opacity: isTriggering ? 0.7 : 1
            } : undefined}
          >
            <Send size={12} className="mr-1" />
            {isTriggering ? '触发中...' : '立即触发'}
          </Button>
        ) : (
          <div className="flex items-center gap-1 w-full">
            {timerStatus === 'running' ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-7 text-xs" 
                onClick={pauseTimer}
                style={theme ? { borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
              >
                <Pause size={12} className="mr-1" />
                暂停
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-7 text-xs" 
                onClick={startTimer}
                style={theme ? { borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
              >
                <Play size={12} className="mr-1" />
                {timerStatus === 'paused' ? '继续' : '开始'}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={stopTimer}
              title="重置"
              style={theme ? { color: theme.textColor } : undefined}
            >
              <StopCircle size={14} />
            </Button>
          </div>
        )}
      </div>

      {triggerCount > 0 && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t" style={theme ? { borderColor: theme.nodeBorderColor, color: theme.textColor, opacity: 0.7 } : undefined}>
          <span>已触发: {triggerCount}次</span>
          {lastTriggerTime && <span>{lastTriggerTime}</span>}
        </div>
      )}
    </div>
  );
}
