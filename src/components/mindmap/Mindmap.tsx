/**
 * HeySure AI - 思维导图主组件
 * 负责思维导图的完整渲染，包括：
 * - 思维导图头部（标题、模型选择等）
 * - 思维导图工具栏
 * - 思维导图画布（节点渲染、交互）
 * - AI 对话浮窗
 * - 快捷键帮助面板
 * - 自动保存状态提示
 */
import React, { useState, useEffect } from 'react';
import { MindmapHeader } from './header/MindmapHeader';
import { MindmapToolbar } from './canvas/MindmapToolbar';
import { MindmapCanvas } from './canvas/MindmapCanvas';
import { MindmapShortcutHelp } from './canvas/MindmapShortcutHelp';
import { MindmapFloatingChat } from './chat/MindmapFloatingChat';
import { MindmapNode } from './types';
import { useMindmapController } from './hooks/useMindmapController';
import { mindmapStorage } from './services/mindmap-storage';
import { flowStorage } from '../flow/flow-storage';

interface MindmapProps {
  onNodeClick?: (node: MindmapNode) => void;
}

const Mindmap: React.FC<MindmapProps> = (props) => {
  const {
    headerProps,
    toolbarProps,
    canvasProps,
    floatingChatProps,
    containerRef
  } = useMindmapController(props);

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    // Initialize flow storage to ensure we have access to flows for trigger nodes
    flowStorage.init().catch(console.error);

    const unsubscribe = mindmapStorage.onSave(() => {
      setSaveStatus('已自动保存');
      setTimeout(() => setSaveStatus(null), 1000);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="flex flex-col h-full bg-background text-foreground" ref={containerRef}>
      <MindmapHeader {...headerProps} />

      <div className="flex-1 relative overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
        <MindmapCanvas {...canvasProps} />

        <MindmapToolbar {...toolbarProps} />

        <MindmapShortcutHelp nodeCount={Object.keys(canvasProps.nodeIndex || {}).length} />

        {/* AI 对话浮窗 - 在 Mindmap 模式下始终挂载，但可能隐藏 */}
        {floatingChatProps.shouldShow && (
          <MindmapFloatingChat
            isOpen={floatingChatProps.isOpen}
            onClose={floatingChatProps.onClose}
            position={floatingChatProps.position}
            model={floatingChatProps.model}
            onResponse={floatingChatProps.onResponse}
            contextAppendix={floatingChatProps.contextAppendix}
          />
        )}

        {/* 自动保存状态提示 */}
        {saveStatus && (
          <div className="absolute top-4 right-4 text-xs text-muted-foreground/60 pointer-events-none select-none animate-in fade-in slide-in-from-top-2 duration-300">
            {saveStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default Mindmap;
