/**
 * HeySure AI - 用户输入节点内容组件
 * 用于收集用户输入的流程节点：
 * - 文本输入框
 * - 输入格式配置（纯文本/JSON）
 * - 发送按钮
 * - 配置弹窗入口
 */
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { User, Send, Settings } from 'lucide-react';
import { UserInputConfigModal, type UserInputConfig } from './UserInputConfigModal';
import type { ThemeConfig } from '@/types/theme';
import { BaseNodeContainer } from './common/BaseNodeContainer';

interface UserInputNodeContentProps {
  data: any;
  onChange?: (value: string) => void;
  onConfigChange?: (config: UserInputConfig) => void;
  onSend?: () => void;
  theme?: ThemeConfig;
}

export function UserInputNodeContent({ data, onChange, onConfigChange, onSend, theme }: UserInputNodeContentProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const headerActions = (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 nodrag"
      onClick={(e) => {
        e.stopPropagation();
        setIsConfigOpen(true);
      }}
      style={theme ? { color: theme.textColor } : undefined}
    >
      <Settings size={12} />
    </Button>
  );

  const footer = (
    <Button 
      size="sm" 
      className="w-full h-7 text-xs nodrag" 
      onClick={(e) => {
        e.stopPropagation();
        onSend?.();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={theme ? { 
        backgroundColor: theme.lineColor, 
        color: '#fff',
        borderColor: theme.nodeBorderColor
      } : undefined}
    >
      <Send size={12} className="mr-1" />
      发送
    </Button>
  );

  return (
    <BaseNodeContainer
      label="用户输入"
      icon={<User size={14} />}
      theme={theme}
      headerActions={headerActions}
      footer={footer}
      showStatus={false}
      width="w-[200px]"
      contentClassName="p-2 pt-0"
    >
      <Textarea 
        placeholder="请输入内容..." 
        className="min-h-[80px] text-xs resize-none nodrag select-text"
        style={{ 
          pointerEvents: 'auto',
          ...(theme ? { 
            backgroundColor: theme.backgroundColor, 
            borderColor: theme.nodeBorderColor, 
            color: theme.textColor 
          } : {})
        }}
        value={data?.value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend?.();
            }
        }}
        onPointerDown={(e) => e.stopPropagation()} 
      />

      <UserInputConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSave={(config) => onConfigChange?.(config)}
        initialConfig={data?.config}
      />
    </BaseNodeContainer>
  );
}
