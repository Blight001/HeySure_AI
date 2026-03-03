/**
 * HeySure AI - 流程节点通用组件
 * 所有类型流程节点的父组件，处理通用逻辑：
 * - 节点拖拽处理
 * - 节点边框状态（空闲/运行/完成）
 * - 输入/输出端口渲染
 * - 节点选中状态显示
 * - 节点内容区域插槽
 * - 节点删除按钮
 */
// ============ 通用流程节点组件 ============
import { useState, useRef, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { NodeHandle } from './NodeHandle';
import type { FlowNode } from '@/types/flow';
import type { ConnectionState } from '../core/types';

// 节点尺寸常量
const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;

// 节点状态边框颜色配置
const STATUS_BORDER_COLORS = {
  idle: 'border-green-500', // 输入内容就绪 (绿色)
  running: 'border-red-500', // 正在运行 (红色)
  completed: 'border-blue-500', // 输出完成 (蓝色)
};

interface FlowNodeProps {
  node: FlowNode;
  selected: boolean;
  connectionState: ConnectionState;
  onSelect: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onStartConnection: (nodeId: string, handleId: string, handleType: 'input' | 'output') => void;
  onCompleteConnection: (targetNodeId: string, targetHandleId: string) => void;
  onDragStart: (e: React.MouseEvent<HTMLElement>, nodeId: string) => void;
  onDoubleClick?: () => void;
  onSave?: (nodeId: string) => void;  // 保存节点回调
  onUpdate?: (nodeId: string, data: any) => void; // 更新节点数据
  onResize?: (nodeId: string, size: { width: number; height: number }) => void; // 节点尺寸变化回调
  style?: React.CSSProperties; // 容器样式 (位置等)
  contentStyle?: React.CSSProperties; // 内容样式 (背景、边框等)
  highlightType?: 'delete' | 'modify' | 'add'; // AI 修改高亮类型
  children: React.ReactNode;
}

// 获取 handle 位置的辅助函数
export function getHandlePosition(
  nodePosition: { x: number; y: number },
  handleType: 'input' | 'output',
  nodeWidth: number = NODE_WIDTH,
  nodeHeight: number = NODE_HEIGHT
): { x: number; y: number } {
  const halfHeight = nodeHeight / 2;
  return {
    x: handleType === 'output' ? nodePosition.x + nodeWidth : nodePosition.x,
    y: nodePosition.y + halfHeight
  };
}

export function FlowNode({
  node,
  selected,
  connectionState,
  onSelect,
  onDelete,
  onStartConnection,
  onCompleteConnection,
  onDragStart,
  onDoubleClick,
  onSave,
  onUpdate,
  onResize,
  style,
  contentStyle,
  highlightType,
  children
}: FlowNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // 监听节点尺寸变化
  useEffect(() => {
    if (!nodeRef.current || !onResize) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { offsetWidth, offsetHeight } = entry.target as HTMLDivElement;
        onResize(node.id, { width: offsetWidth, height: offsetHeight });
      }
    });

    observer.observe(nodeRef.current);

    return () => observer.disconnect();
  }, [node.id, onResize]);

  const isSourceConnecting = connectionState.isConnecting &&
    connectionState.sourceNodeId === node.id;

  const isTargetNode = connectionState.isConnecting &&
    connectionState.sourceNodeId !== node.id;

  // 计算节点状态边框
  const status = node.data?.status as keyof typeof STATUS_BORDER_COLORS | undefined;
  const statusBorderClass = status ? STATUS_BORDER_COLORS[status] : '';
  
  // 边框类名组合逻辑
  // 1. 如果有状态，优先显示状态边框
  // 2. 如果没有状态但选中，显示默认选中样式 (在外部 div 处理)
  // 3. 默认边框在内部 div
  // 4. AI高亮显示
  let borderStyle = statusBorderClass;
  if (highlightType === 'delete') {
    borderStyle = 'border-red-500 border-2 border-dashed shadow-[0_0_10px_rgba(239,68,68,0.5)]';
  } else if (highlightType === 'modify') {
    borderStyle = 'border-yellow-500 border-2 border-dashed shadow-[0_0_10px_rgba(234,179,8,0.5)]';
  } else if (highlightType === 'add') {
    borderStyle = 'border-blue-500 border-2 border-dashed shadow-[0_0_10px_rgba(59,130,246,0.5)]';
  }
  
  // 注意：这里我们修改内部 div 的 border 样式来显示状态颜色
  const contentBorderClass = borderStyle 
    ? `border-2 ${borderStyle}` 
    : 'border';

  // 是否交换端口位置
  const isPortsReversed = node.data?.layout === 'reversed';

  // 右键菜单处理
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // 点击其他地方关闭菜单
  const handleClick = () => {
    setShowContextMenu(false);
  };

  return (
    <div
      ref={nodeRef}
      data-flow-node
      className={`absolute cursor-move transition-shadow select-none ${
        isSourceConnecting ? 'ring-2 ring-blue-500' : ''
      }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        minWidth: `${NODE_WIDTH}px`,
        ...style,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e);
        handleClick();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      onContextMenu={handleContextMenu}
      onMouseDown={(e) => {
        if (e.button !== 0) return; // 只响应左键
        if (connectionState.isConnecting) {
          e.preventDefault();
          return;
        }
        e.stopPropagation();
        onDragStart(e, node.id);
      }}
    >
      {/* 节点内容 */}
      <div 
        className={`${selected ? 'bg-primary/10' : 'bg-card'} rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow h-full relative z-10 ${contentBorderClass} group`}
        style={contentStyle}
        onMouseDown={(e) => {
          // 阻止事件冒泡，防止触发节点拖拽
          // 允许在内容区域进行交互（如选择文本、拖动滑块）
          // 只有点击非交互区域时才允许冒泡到外层触发拖拽
          const target = e.target as HTMLElement;
          const isInteractive = target.matches('input, textarea, button, a, [role="button"], [role="slider"]');
          if (isInteractive) {
            e.stopPropagation();
          }
        }}
      >
        {/* 交换端口按钮 - 悬停显示 */}
        <button
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded-full transition-opacity z-50"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate?.(node.id, { layout: isPortsReversed ? 'default' : 'reversed' });
          }}
          title="切换端口位置"
        >
          <ArrowRightLeft size={12} className="text-muted-foreground" />
        </button>
        {children}
      </div>

      {/* 输入端口 */}
      {node.inputs.length > 0 && (
        <div className={`absolute ${isPortsReversed ? '-right-2.5' : '-left-2.5'} top-0 bottom-0 flex flex-col justify-center gap-2 z-20`}>
          {node.inputs.map((input) => (
            <NodeHandle
              key={input.id}
              port={input}
              isConnecting={connectionState.isConnecting}
              isSourceConnecting={isSourceConnecting}
              isTargetNode={isTargetNode}
              onClick={() => {
                if (connectionState.isConnecting) {
                  onCompleteConnection(node.id, input.id);
                } else {
                  onStartConnection(node.id, input.id, 'input');
                }
              }}
              position="input"
            />
          ))}
        </div>
      )}

      {/* 输出端口 */}
      {node.outputs.length > 0 && (
        <div className={`absolute ${isPortsReversed ? '-left-2.5' : '-right-2.5'} top-0 bottom-0 flex flex-col justify-center gap-2 z-20`}>
          {node.outputs.map((output) => (
            <NodeHandle
              key={output.id}
              port={output}
              isConnecting={connectionState.isConnecting}
              isSourceConnecting={isSourceConnecting}
              isTargetNode={isTargetNode}
              onClick={() => {
                if (connectionState.isConnecting) {
                  // 允许连接到输出端口（作为中继或合并）
                  onCompleteConnection(node.id, output.id);
                } else {
                  onStartConnection(node.id, output.id, 'output');
                }
              }}
              position="output"
            />
          ))}
        </div>
      )}

      {/* 删除按钮 */}
      {selected && (
        <button
          className="absolute -top-3 -right-3 z-30 bg-red-500 text-white rounded-full p-1.5 shadow-sm hover:bg-red-600 transition-colors cursor-pointer"
          title="删除节点"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
