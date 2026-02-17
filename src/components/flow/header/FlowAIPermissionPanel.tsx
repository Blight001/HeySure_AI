/**
 * HeySure AI - 流程 AI 权限设置面板组件
 * 控制 AI 在流程编辑中的操作权限：
 * - 允许 AI 读取流程内容
 * - 允许 AI 自动编辑流程
 * - 允许 AI 自动执行流程
 * - 点击外部自动关闭
 */
import React, { useState } from 'react';
import { Shield, ShieldCheck, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useClickOutside } from '@/hooks/useClickOutside';

import type { ThemeConfig } from '@/types/theme';

interface FlowAIPermissionPanelProps {
  allowReadFlow: boolean;
  allowAiEdit: boolean;
  allowAiAutoExecution: boolean;
  onAllowReadChange: (value: boolean) => void;
  onAllowEditChange: (value: boolean) => void;
  onAllowAutoExecutionChange: (value: boolean) => void;
  theme?: ThemeConfig;
}

export const FlowAIPermissionPanel: React.FC<FlowAIPermissionPanelProps> = ({
  allowReadFlow,
  allowAiEdit,
  allowAiAutoExecution,
  onAllowReadChange,
  onAllowEditChange,
  onAllowAutoExecutionChange,
  theme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  return (
    <div className="relative" ref={panelRef}>
      {/* 权限按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 text-muted-foreground hover:text-foreground border border-input hover:border-muted-foreground/50"
        style={theme ? { 
          borderColor: theme.nodeBorderColor,
          color: theme.textColor
        } : undefined}
        title="AI 权限设置"
      >
        {allowAiEdit ? (
          <ShieldCheck size={16} className="text-green-500" />
        ) : allowReadFlow ? (
          <Shield size={16} className="text-yellow-500" />
        ) : (
          <ShieldAlert size={16} className="text-gray-400" />
        )}
        <span className="text-sm">权限</span>
      </Button>

      {/* 权限设置面板 */}
      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-2 p-4 rounded-lg shadow-xl border bg-card min-w-[280px] z-50"
          style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Shield size={16} />
              AI 访问权限
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
              style={theme ? { color: theme.textColor } : undefined}
            >
              <X size={14} />
            </Button>
          </div>

          <div className="space-y-4">
            {/* 读取权限 */}
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-3">
                <div className="text-xs font-medium mb-0.5">读取流程图</div>
                <div className="text-[10px] text-muted-foreground" style={theme ? { color: theme.textColor, opacity: 0.7 } : undefined}>
                  允许 AI 查看当前流程图的结构和内容
                </div>
              </div>
              <Switch
                checked={allowReadFlow}
                onCheckedChange={(checked) => {
                  onAllowReadChange(checked);
                  if (!checked) {
                    onAllowEditChange(false);
                  }
                }}
              />
            </div>

            {/* 编辑权限 */}
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-3">
                <div className="text-xs font-medium mb-0.5">修改流程图</div>
                <div className="text-[10px] text-muted-foreground" style={theme ? { color: theme.textColor, opacity: 0.7 } : undefined}>
                  允许 AI 添加、删除节点和连线
                </div>
              </div>
              <Switch
                checked={allowAiEdit}
                disabled={!allowReadFlow}
                onCheckedChange={(checked) => {
                  onAllowEditChange(checked);
                  if (!checked) {
                    onAllowAutoExecutionChange(false);
                  }
                }}
              />
            </div>

            {/* 自动执行权限 */}
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-3">
                <div className="text-xs font-medium mb-0.5">自动执行</div>
                <div className="text-[10px] text-muted-foreground" style={theme ? { color: theme.textColor, opacity: 0.7 } : undefined}>
                  允许 AI 自动运行流程节点
                </div>
              </div>
              <Switch
                checked={allowAiAutoExecution}
                onCheckedChange={onAllowAutoExecutionChange}
                disabled={!allowAiEdit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
