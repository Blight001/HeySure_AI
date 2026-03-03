/**
 * HeySure AI - 开关节点内容组件
 * 用于信号控制的流程节点（类似延迟门）：
 * - 开关状态显示（开/关）
 * - 暂存信号显示
 * - 信号数量统计
 * - 最后信号时间显示
 * - 手动开启/关闭控制
 */
// ============ 开关节点内容组件 ============
import { useEffect, useState } from 'react';
import { Power, Signal, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ThemeConfig } from '@/types/theme';
import { BaseNodeContainer } from './common/BaseNodeContainer';

interface SwitchNodeData {
  label?: string;
  isOn?: boolean;              // 开关状态
  pendingSignal?: any;         // 暂存的单个信号（新格式）
  hasPendingSignal?: boolean;  // 是否有待转发的信号（新格式）
  pendingSignals?: any[];       // 暂存的信号列表（旧格式，兼容用）
  signalCount?: number;         // 暂存信号数量（旧格式，兼容用）
  lastSignalTime?: string;     // 最后信号时间
}

interface SwitchNodeContentProps {
  data: SwitchNodeData;
  onToggle?: (isOn: boolean) => void;
  onClearSignal?: () => void;
  onSend?: () => void;
  theme?: ThemeConfig;
}

export function SwitchNodeContent({
  data,
  onToggle,
  onClearSignal,
  onSend,
  theme
}: SwitchNodeContentProps) {
  const isOn = data.isOn ?? false;

  // 向后兼容：优先使用新格式，其次检查旧格式是否有信号
  const hasPendingSignal = (data.hasPendingSignal !== undefined && data.hasPendingSignal)
    || data.pendingSignal !== undefined
    || (data.pendingSignals && data.pendingSignals.length > 0);

  // 当开关从关闭变为开启时，自动发送暂存的信号
  const [wasOff, setWasOff] = useState(!isOn);

  useEffect(() => {
    if (wasOff && isOn && hasPendingSignal && onSend) {
      // 开关开启且有待发送信号，自动发送
      onSend();
    }
    setWasOff(!isOn);
  }, [isOn, hasPendingSignal, wasOff, onSend]);

  const headerActions = (
    <Badge
      variant={isOn ? 'default' : 'outline'}
      className={`text-xs px-1.5 py-0 ${!theme && isOn ? 'bg-green-500' : ''}`}
      style={theme ? { 
        backgroundColor: isOn ? theme.lineColor : 'transparent',
        borderColor: theme.nodeBorderColor, 
        color: isOn ? '#fff' : theme.textColor 
      } : undefined}
    >
      {isOn ? 'ON' : 'OFF'}
    </Badge>
  );

  const footer = (
    <div className="flex gap-1">
      {/* 开关按钮 */}
      <Button
        size="sm"
        variant={isOn ? 'default' : 'outline'}
        className={`flex-1 h-7 text-xs ${!theme && isOn ? 'bg-green-500 hover:bg-green-600' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.(!isOn);
        }}
        // BaseNodeContainer handles stopPropagation on header/footer usually but explicit is safe
        style={theme ? { 
          backgroundColor: isOn ? theme.lineColor : 'transparent',
          borderColor: theme.nodeBorderColor, 
          color: isOn ? '#fff' : theme.textColor 
        } : undefined}
      >
        <Power size={12} className="mr-1" />
        {isOn ? '关闭' : '开启'}
      </Button>

      {/* 清空信号按钮 */}
      {hasPendingSignal && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onClearSignal?.();
          }}
          title="清空暂存的信号"
          style={theme ? { color: theme.textColor } : undefined}
        >
          清空
        </Button>
      )}
    </div>
  );

  return (
    <BaseNodeContainer
      label={data.label || '开关'}
      icon={<Power size={14} className={isOn ? 'text-green-500' : 'text-muted-foreground'} />}
      theme={theme}
      headerActions={headerActions}
      footer={footer}
      showStatus={false}
      width="w-auto"
      className="min-w-[160px]"
      contentClassName="p-2 pt-0"
    >
      <div className="flex flex-col gap-2">
        {/* 信号状态显示 */}
        <div 
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
            !theme ? (hasPendingSignal
              ? 'bg-amber-50 border border-amber-200 text-amber-700'
              : 'text-muted-foreground') : ''
          }`}
          style={theme ? {
            color: hasPendingSignal ? theme.lineColor : theme.textColor,
            borderColor: hasPendingSignal ? theme.lineColor : 'transparent',
            borderWidth: hasPendingSignal ? '1px' : '0',
            backgroundColor: hasPendingSignal ? `${theme.lineColor}1A` : 'transparent' // 10% opacity
          } : undefined}
        >
          {hasPendingSignal ? (
            <>
              <Signal size={12} className={!theme ? "text-amber-500" : ""} style={theme ? { color: theme.lineColor } : undefined} />
              <span>信号待转发</span>
            </>
          ) : isOn ? (
            <>
              <Signal size={12} className={!theme ? "text-green-500" : ""} style={theme ? { color: theme.lineColor } : undefined} />
              <span>开启中，自动转发</span>
            </>
          ) : (
            <>
              <Signal size={12} style={theme ? { color: theme.textColor, opacity: 0.7 } : undefined} />
              <span>等待信号...</span>
            </>
          )}
        </div>

        {/* 时间戳 */}
        {data.lastSignalTime && (
          <div className="flex items-center gap-1 text-[10px]" style={{ color: theme ? theme.textColor : undefined, opacity: theme ? 0.7 : undefined }}>
            <Clock size={10} className={!theme ? "text-muted-foreground" : ""} />
            <span className={!theme ? "text-muted-foreground" : ""}>最后信号: {data.lastSignalTime}</span>
          </div>
        )}
      </div>
    </BaseNodeContainer>
  );
}

