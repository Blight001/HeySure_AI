/**
 * HeySure AI - 思维导图 AI 权限设置面板组件
 * 控制 AI 在思维导图中的操作权限：
 * - 允许 AI 读取思维导图内容
 * - 允许 AI 自动编辑和修改思维导图
 * - 点击外部自动关闭
 */
import React, { useState, useRef, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useClickOutside } from '@/hooks/useClickOutside';
import type { ThemeConfig } from '@/types/theme';

interface AIPermissionPanelProps {
  currentTheme: ThemeConfig;
  allowReadMindmap: boolean;
  allowAiEdit: boolean;
  onAllowReadChange: (value: boolean) => void;
  onAllowEditChange: (value: boolean) => void;
}

export const AIPermissionPanel: React.FC<AIPermissionPanelProps> = ({
  currentTheme,
  allowReadMindmap,
  allowAiEdit,
  onAllowReadChange,
  onAllowEditChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const panelRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  const buttonStyle = {
    backgroundColor: currentTheme.nodeBackgroundColor,
    borderColor: currentTheme.nodeBorderColor,
    color: currentTheme.textColor
  };

  const panelStyle = {
    backgroundColor: currentTheme.nodeBackgroundColor,
    borderColor: currentTheme.nodeBorderColor,
    color: currentTheme.textColor
  };

  return (
    <div className="absolute bottom-4 right-4 z-40" ref={panelRef}>
      {/* 权限按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 shadow-lg"
        style={buttonStyle}
        title="AI 权限设置"
      >
        {allowAiEdit ? (
          <ShieldCheck size={16} className="text-green-500" />
        ) : allowReadMindmap ? (
          <Shield size={16} className="text-yellow-500" />
        ) : (
          <ShieldAlert size={16} className="text-gray-400" />
        )}
        <span className="text-xs">AI 权限</span>
      </Button>

      {/* 权限设置面板 */}
      {isOpen && (
        <div
          className="absolute bottom-full right-0 mb-2 p-4 rounded-lg shadow-xl border min-w-[280px]"
          style={panelStyle}
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
            >
              <X size={14} />
            </Button>
          </div>

          <div className="space-y-4">
            {/* 读取权限 */}
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-3">
                <div className="text-xs font-medium mb-0.5">读取思维导图</div>
                <div className="text-[10px] opacity-70">
                  允许 AI 查看当前思维导图的结构和内容
                </div>
              </div>
              <Switch
                checked={allowReadMindmap}
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
                <div className="text-xs font-medium mb-0.5">AI 编辑权限</div>
                <div className="text-[10px] opacity-70">
                  允许 AI 生成修改建议并自动应用
                </div>
              </div>
              <Switch
                checked={allowAiEdit}
                onCheckedChange={onAllowEditChange}
                disabled={!allowReadMindmap}
              />
            </div>

            {/* 提示信息 */}
            {!allowReadMindmap && (
              <div className="p-2 rounded bg-yellow-500/10 text-yellow-600 text-[10px]">
                请先开启「读取思维导图」权限，才能启用编辑权限
              </div>
            )}

            {/* 当前状态 */}
            <div className="pt-2 border-t border-opacity-20" style={{ borderColor: currentTheme.gridColor }}>
              <div className="text-[10px] opacity-60">
                当前状态：
                {allowAiEdit ? (
                  <span className="text-green-500 ml-1">完全访问</span>
                ) : allowReadMindmap ? (
                  <span className="text-yellow-500 ml-1">仅读取</span>
                ) : (
                  <span className="text-gray-400 ml-1">无权限</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

