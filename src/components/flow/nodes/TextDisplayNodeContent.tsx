/**
 * HeySure AI - 文本显示节点内容组件
 * 用于显示文本内容的流程节点：
 * - 预设文本显示
 * - 输入模式配置（覆盖/追加/触发）
 * - 动态内容更新显示
 * - 刷新和触发功能
 * - 内容清空功能
 */
import { FileText, Trash2, Maximize2, Minimize2, Plus, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import type { ThemeConfig } from '@/types/theme';
import { BaseNodeContainer } from './common/BaseNodeContainer';

type InputMode = 'overwrite' | 'append' | 'trigger';

interface TextDisplayNodeContentProps {
  data: {
    value?: string;
    presetText?: string;
    inputMode?: InputMode;
    [key: string]: any;
  };
  onClear?: () => void;
  onUpdate?: (newData: TextDisplayUpdateData) => void;
  theme?: ThemeConfig;
}

interface TextDisplayUpdateData {
  presetText?: string;
  displayText?: string;
  receivedData?: string;
  isExpanded?: boolean;
  inputMode?: InputMode;
}

export function TextDisplayNodeContent({ data, onClear, onUpdate, theme }: TextDisplayNodeContentProps) {
  // 优先使用 presetText，其次兼容 value 字段
  const [editValue, setEditValue] = useState(data.presetText || data.value || '');
  const [isExpanded, setIsExpanded] = useState(data.isExpanded || false);
  const [inputMode, setInputMode] = useState<InputMode>(data.inputMode || 'overwrite');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初始化或数据变更时更新本地状态
  useEffect(() => {
    if (data.presetText !== undefined) {
      setEditValue(data.presetText);
    } else if (data.value !== undefined && !data.presetText) {
      // 兼容旧数据：如果没有 presetText 但有 value，使用 value
      setEditValue(data.value);
    }
  }, [data.presetText, data.value]);

  // 同步 inputMode 状态
  useEffect(() => {
    if (data.inputMode) {
      setInputMode(data.inputMode);
    }
  }, [data.inputMode]);

  // 同步 isExpanded 状态
  useEffect(() => {
    if (data.isExpanded !== undefined) {
      setIsExpanded(data.isExpanded);
    }
  }, [data.isExpanded]);

  // 展开模式下自动调整高度
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    } else if (!isExpanded && textareaRef.current) {
      textareaRef.current.style.height = ''; // 重置高度
    }
  }, [editValue, data.displayText, isExpanded]);

  // 处理输入变化 - 只更新本地状态，不立即保存
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);

    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 设置新的定时器：用户停止输入 1 秒后保存
    saveTimerRef.current = setTimeout(() => {
      // 调用外部更新函数
      if (onUpdate) {
        onUpdate({
          presetText: newValue,
          // 用户编辑时，清除 displayText，让编辑的内容显示
          displayText: undefined,
        });
        console.log('[TextDisplay] 已自动保存');
      }
    }, 1000);
  };

  // 处理展开/收起切换
  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onUpdate) {
      onUpdate({ isExpanded: newExpanded });
    }
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // 清空处理
  const handleClear = () => {
    setEditValue('');
    if (onClear) {
      onClear();
    }
    // 同时清除定时器并清空保存的内容
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (onUpdate) {
      onUpdate({
        presetText: '',
        displayText: undefined,
        receivedData: undefined,
      });
    }
  };

  // 切换输入模式
  const cycleInputMode = () => {
    const modes: InputMode[] = ['overwrite', 'append', 'trigger'];
    const currentIndex = modes.indexOf(inputMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    setInputMode(nextMode);
    if (onUpdate) {
      onUpdate({ inputMode: nextMode });
    }
  };

  const getModeIcon = () => {
    switch (inputMode) {
      case 'overwrite': return <RefreshCw size={12} />;
      case 'append': return <Plus size={12} />;
      case 'trigger': return <Zap size={12} />;
    }
  };

  const getModeTitle = () => {
    switch (inputMode) {
      case 'overwrite': return "覆盖模式 (Overwrite)";
      case 'append': return "相加模式 (Append)";
      case 'trigger': return "触发模式 (Trigger)";
    }
  };

  // 显示逻辑：
  // 1. 优先显示从外部收到的数据 (displayText)
  // 2. 否则显示本地编辑的内容 (editValue)
  // 3. 都没有时显示空字符串

  const displayValue = (data.displayText ?? editValue) || '';

  const headerActions = (
    <>
        {/* 模式切换按钮 */}
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 nodrag"
            onClick={cycleInputMode}
            title={getModeTitle()}
            style={theme ? { color: theme.textColor } : undefined}
        >
            {getModeIcon()}
        </Button>
        {/* 展开/收起按钮 */}
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 nodrag"
            onClick={handleToggleExpand}
            title={isExpanded ? "收起内容" : "展开全部内容"}
            style={theme ? { color: theme.textColor } : undefined}
        >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </Button>
        {/* 清空按钮 */}
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 nodrag"
            onClick={handleClear}
            title="清空内容"
            style={theme ? { color: theme.textColor } : undefined}
        >
            <Trash2 size={12} />
        </Button>
    </>
  );

  return (
    <BaseNodeContainer
      label="文本显示"
      icon={<FileText size={14} />}
      theme={theme}
      headerActions={headerActions}
      width="w-[220px]"
      showStatus={false}
    >
      {/* 可编辑区域 */}
      <textarea
        ref={textareaRef}
        className={`w-full p-2 rounded-md border bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 nodrag select-text ${
            isExpanded ? 'overflow-hidden' : 'min-h-[60px] max-h-[150px]'
        }`}
        style={theme ? { 
            backgroundColor: theme.backgroundColor, 
            borderColor: theme.nodeBorderColor, 
            color: theme.textColor 
          } : undefined}
        value={displayValue}
        onChange={handleChange}
        placeholder="在此输入文字内容..."
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      />
    </BaseNodeContainer>
  );
}
