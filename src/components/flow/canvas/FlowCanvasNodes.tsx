/**
 * HeySure AI - 流程画布节点渲染组件
 * 负责将流程节点渲染到画布上，包括：
 * - 根据节点类型渲染不同的节点内容组件
 * - 节点位置计算
 * - 节点选中状态显示
 * - 节点拖拽处理
 * - 节点连接状态显示
 */
import { useCallback } from 'react';
import {
  FlowNode,
  BasicNodeContent,
  AINodeContent,
  LogicNodeContent,
  PythonNodeContent,
  UserInputNodeContent,
  TextDisplayNodeContent,
  SwitchNodeContent,
  TriggerNodeContent,
  SimpleTriggerButton,
} from '../nodes';
import type { FlowNode as FlowNodeType } from '@/types/flow';
import type { LocalModelConfig } from '@/types/flow';
import type { ThemeConfig } from '@/types/theme';

interface FlowCanvasNodesProps {
  nodes: FlowNodeType[];
  selectedNodeIds: Set<string>;
  connectionState: any;
  pendingChangeState: {
    nodes: Record<string, 'add' | 'delete' | 'modify'>;
  };
  models: LocalModelConfig[];
  theme?: ThemeConfig;
  onSelect: (nodeId: string, isMulti: boolean) => void;
  onDelete: (nodeId: string) => void;
  onStartConnection: any;
  onCompleteConnection: any;
  onSave: (nodeId: string) => void;
  onUpdate: (nodeId: string, data: any) => void;
  onDragStart: any;
  onResize: (nodeId: string, size: { width: number; height: number }) => void;
  
  // Node specific handlers
  onTogglePythonMode: (nodeId: string) => void;
  onToggleMemory: (nodeId: string, useMemory: boolean) => void;
  onClearHistory: (nodeId: string) => void;
  onUserInputSend: (nodeId: string, value: string) => void;
  onSwitchSend: (nodeId: string) => void;
  onTrigger: (nodeId: string) => void;
  onSimpleTrigger: (nodeId: string) => void;
}

export function FlowCanvasNodes({
  nodes,
  selectedNodeIds,
  connectionState,
  pendingChangeState,
  models,
  theme,
  onSelect,
  onDelete,
  onStartConnection,
  onCompleteConnection,
  onSave,
  onUpdate,
  onDragStart,
  onResize,
  onTogglePythonMode,
  onToggleMemory,
  onClearHistory,
  onUserInputSend,
  onSwitchSend,
  onTrigger,
  onSimpleTrigger
}: FlowCanvasNodesProps) {

  const renderNodeContent = useCallback((node: FlowNodeType) => {
    switch (node.type) {
      case 'python':
        return (
          <PythonNodeContent
            label={node.data?.label || 'Python'}
            unifiedInput={node.data?.unifiedInput}
            onToggleMode={() => onTogglePythonMode(node.id)}
            theme={theme}
          />
        );
      case 'aiChat':
        return (
          <AINodeContent
            label={node.data?.label || 'AI对话'}
            modelId={node.data?.modelId}
            models={models}
            tokenStats={node.data?.tokenStats}
            useMemory={node.data?.useMemory !== false}
            onToggleMemory={(useMemory) => onToggleMemory(node.id, useMemory)}
            onClearHistory={() => onClearHistory(node.id)}
            onModelChange={(model) =>
              onUpdate(node.id, {
                label: model.name,
                modelId: model.id,
                model: model.model
              })
            }
            theme={theme}
          />
        );
      case 'condition':
      case 'parallel':
      case 'aggregate':
        return <LogicNodeContent type={node.type} label={node.data?.label || '逻辑节点'} theme={theme} />;
      case 'userInput':
        return (
          <UserInputNodeContent
            data={node.data}
            onChange={(value) => onUpdate(node.id, { value })}
            onConfigChange={(config) => onUpdate(node.id, { config })}
            onSend={() => onUserInputSend(node.id, node.data?.value)}
            theme={theme}
          />
        );
      case 'textDisplay':
        return <TextDisplayNodeContent
          data={node.data}
          onClear={() => onUpdate(node.id, { value: '' })}
          onUpdate={(newData) => onUpdate(node.id, newData)}
          theme={theme}
        />;
      case 'switch':
        return (
          <SwitchNodeContent
            data={node.data}
            onToggle={(isOn) => onUpdate(node.id, { isOn })}
            onClearSignal={() => onUpdate(node.id, { pendingSignal: undefined, hasPendingSignal: false })}
            onSend={() => onSwitchSend(node.id)}
            theme={theme}
          />
        );
      case 'trigger':
        return (
          <TriggerNodeContent
            data={node.data}
            onTrigger={() => onTrigger(node.id)}
            onConfigChange={(config) => onUpdate(node.id, config)}
            theme={theme}
          />
        );
      case 'simpleTrigger':
        return (
          <div className="flex items-center justify-center w-20 h-full">
            <SimpleTriggerButton label={node.data?.label || '触发'} onTrigger={() => onSimpleTrigger(node.id)} theme={theme} />
          </div>
        );
      case 'start':
      case 'end':
        return (
          <div className="flex items-center justify-center w-20 h-full">
            <BasicNodeContent type={node.type} label={node.data?.label || '节点'} icon={node.data?.icon} theme={theme} />
          </div>
        );
      default:
        return <BasicNodeContent type={node.type} label={node.data?.label || '节点'} icon={node.data?.icon} theme={theme} />;
    }
  }, [models, theme, onTogglePythonMode, onToggleMemory, onClearHistory, onUpdate, onUserInputSend, onSwitchSend, onTrigger, onSimpleTrigger]);

  return (
    <div className="relative" style={{ zIndex: 1 }}>
      {nodes.map((node) => {
        const hasStatus = Boolean(node.data?.status);
        const hasHighlight = Boolean(pendingChangeState.nodes[node.id]);
        const selectedBackgroundColor = theme?.lineColor ? `${theme.lineColor}1A` : undefined;
        const contentStyle = {
          backgroundColor: selectedNodeIds.has(node.id)
            ? selectedBackgroundColor ?? theme?.nodeBackgroundColor
            : theme?.nodeBackgroundColor,
          borderColor: !hasStatus && !hasHighlight ? theme?.nodeBorderColor : undefined,
          borderWidth: !hasStatus && !hasHighlight && theme?.nodeBorderWidth ? `${theme.nodeBorderWidth}px` : undefined,
          borderRadius: theme?.nodeBorderRadius ? `${theme.nodeBorderRadius}px` : undefined,
          color: theme?.textColor,
        };

        return (
          <FlowNode
            key={node.id}
            node={node}
            selected={selectedNodeIds.has(node.id)}
            connectionState={connectionState}
            onSelect={(e: React.MouseEvent) => onSelect(node.id, e.ctrlKey || e.shiftKey)}
            onDelete={() => onDelete(node.id)}
            onStartConnection={onStartConnection}
            onCompleteConnection={onCompleteConnection}
            onSave={onSave}
            onUpdate={onUpdate}
            onDragStart={onDragStart}
            onResize={onResize}
            highlightType={pendingChangeState.nodes[node.id]}
            style={{
              ...(['start', 'end', 'simpleTrigger'].includes(node.type) ? { minWidth: '80px' } : {})
            }}
            contentStyle={contentStyle}
          >
            {renderNodeContent(node)}
          </FlowNode>
        );
      })}
    </div>
  );
}
