/**
 * HeySure AI - 流程画布连线渲染组件
 * 负责渲染流程节点之间的连接线，包括：
 * - 静态连线渲染（直线、曲线、折线样式）
 * - 连线动画效果（数据流动画）
 * - 连线选中状态
 * - 待确认的变更连线（添加/删除状态）
 * - 连线点击删除功能
 */
import { useMemo } from 'react';
import type { FlowEdge, FlowNode } from '@/types/flow';
import { calculatePortY, NODE_WIDTH, NODE_HEIGHT } from '../core/layout';

interface FlowCanvasEdgesProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  nodeSizes: Map<string, { width: number; height: number }>;
  animatingEdges: Set<string>;
  pendingChangeState: {
    nodes: Record<string, 'add' | 'delete' | 'modify'>;
    edges: Record<string, 'add' | 'delete'>;
  };
  connectionStrokeWidth: number;
  animationSpeed: number;
  onEdgeClick: (edge: FlowEdge) => void;
  connectionState: {
    isConnecting: boolean;
    sourceNodeId: string | null;
    sourceHandleId: string | null;
    sourceHandleType: 'input' | 'output' | null;
    mouseX: number;
    mouseY: number;
  };
  defaultColor?: string;
}

const CONNECTION_COLORS = {
  default: '#3b82f6',
  hover: '#ef4444',
  anchor: '#60a5fa',
};

export function FlowCanvasEdges({
  nodes,
  edges,
  nodeSizes,
  animatingEdges,
  pendingChangeState,
  connectionStrokeWidth,
  animationSpeed,
  onEdgeClick,
  connectionState,
  defaultColor
}: FlowCanvasEdgesProps) {

  // Rendering logic for existing edges
  const renderEdges = useMemo(() => {
    return edges.map((edge) => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (!sourceNode || !targetNode) return null;

      const sourceSize = nodeSizes.get(sourceNode.id) || { width: NODE_WIDTH, height: NODE_HEIGHT };
      const targetSize = nodeSizes.get(targetNode.id) || { width: NODE_WIDTH, height: NODE_HEIGHT };

      const isSourceReversed = sourceNode.data?.layout === 'reversed';
      const isTargetReversed = targetNode.data?.layout === 'reversed';

      let sourceX = sourceNode.position.x + sourceSize.width;
      let sourceY = calculatePortY(sourceNode.position.y, 0, 1, sourceSize.height);
      let targetX = targetNode.position.x;
      let targetY = calculatePortY(targetNode.position.y, 0, 1, targetSize.height);

      const sourceInputIndex = sourceNode.inputs.findIndex(i => i.id === edge.sourceHandle);
      const sourceOutputIndex = sourceNode.outputs.findIndex(o => o.id === edge.sourceHandle);
      const targetInputIndex = targetNode.inputs.findIndex(i => i.id === edge.targetHandle);
      const targetOutputIndex = targetNode.outputs.findIndex(o => o.id === edge.targetHandle);

      if (sourceInputIndex !== -1) {
        sourceX = isSourceReversed ? sourceNode.position.x + sourceSize.width : sourceNode.position.x;
        sourceY = calculatePortY(sourceNode.position.y, sourceInputIndex, sourceNode.inputs.length, sourceSize.height);
      } else if (sourceOutputIndex !== -1) {
         sourceX = isSourceReversed ? sourceNode.position.x : sourceNode.position.x + sourceSize.width;
         sourceY = calculatePortY(sourceNode.position.y, sourceOutputIndex, sourceNode.outputs.length, sourceSize.height);
      }

      if (targetInputIndex !== -1) {
        targetX = isTargetReversed ? targetNode.position.x + targetSize.width : targetNode.position.x;
        targetY = calculatePortY(targetNode.position.y, targetInputIndex, targetNode.inputs.length, targetSize.height);
      } else if (targetOutputIndex !== -1) {
        targetX = isTargetReversed ? targetNode.position.x : targetNode.position.x + targetSize.width;
        targetY = calculatePortY(targetNode.position.y, targetOutputIndex, targetNode.outputs.length, targetSize.height);
      }

      const controlOffset = Math.abs(targetX - sourceX) * 0.5;
      const pathD = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;
      const isAnimating = animatingEdges.has(edge.id);
      const hitStrokeWidth = Math.max(6, connectionStrokeWidth);
      const pendingStatus = pendingChangeState.edges[edge.id];
      
      let strokeColor = edge.style?.stroke || defaultColor || CONNECTION_COLORS.default;
      let strokeClass = "transition-colors group-hover:stroke-red-500";
      
      if (pendingStatus === 'delete') {
          strokeColor = '#ef4444'; // Red
          strokeClass = "stroke-red-500 stroke-dashed"; // Dashed for delete
      } else if (pendingStatus === 'add') {
          strokeColor = '#64748b'; // Slate-500 (matching standard edges)
          strokeClass = "stroke-dashed";
      }

      return (
        <g key={edge.id} className="group pointer-events-auto">
          <path
            d={pathD}
            stroke="transparent"
            strokeWidth={hitStrokeWidth}
            fill="none"
            pointerEvents="stroke"
            className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onEdgeClick(edge); }}
          />
          <path
            d={pathD}
            stroke={strokeColor}
            strokeWidth={connectionStrokeWidth}
            fill="none"
            pointerEvents="none"
            className={strokeClass}
            strokeDasharray={pendingStatus ? "5,5" : undefined}
          />
          {isAnimating && (
            <circle r="4" fill="white" className="flow-particle" style={{ offsetPath: `path('${pathD}')`, animationDuration: `${animationSpeed}s` }} />
          )}
          <circle cx={sourceX} cy={sourceY} r={3} fill={CONNECTION_COLORS.anchor} />
          <circle cx={targetX} cy={targetY} r={3} fill={CONNECTION_COLORS.anchor} />
        </g>
      );
    });
  }, [edges, nodes, nodeSizes, animatingEdges, pendingChangeState, connectionStrokeWidth, animationSpeed, onEdgeClick]);

  // Rendering logic for connecting line
  const connectingLine = useMemo(() => {
    if (!connectionState.isConnecting || !connectionState.sourceNodeId) return null;

    const sourceNode = nodes.find(n => n.id === connectionState.sourceNodeId);
    if (!sourceNode) return null;
    
    const sourceSize = nodeSizes.get(sourceNode.id) || { width: NODE_WIDTH, height: NODE_HEIGHT };
    let startX = sourceNode.position.x + sourceSize.width;
    let startY = calculatePortY(sourceNode.position.y, 0, 1, sourceSize.height);
    
    if (connectionState.sourceHandleType === 'input') {
      startX = sourceNode.position.x;
      const idx = sourceNode.inputs.findIndex(i => i.id === connectionState.sourceHandleId);
      if (idx !== -1) startY = calculatePortY(sourceNode.position.y, idx, sourceNode.inputs.length, sourceSize.height);
    } else {
      const idx = sourceNode.outputs.findIndex(o => o.id === connectionState.sourceHandleId);
      if (idx !== -1) startY = calculatePortY(sourceNode.position.y, idx, sourceNode.outputs.length, sourceSize.height);
    }

    return <path d={`M ${startX} ${startY} L ${connectionState.mouseX} ${connectionState.mouseY}`} stroke="#3b82f6" strokeWidth={connectionStrokeWidth} strokeDasharray="5,5" fill="none" className="pointer-events-none" />;
  }, [connectionState, nodes, nodeSizes, connectionStrokeWidth]);

  return (
    <svg className="absolute inset-0 overflow-visible pointer-events-none" style={{ zIndex: 0 }}>
      {renderEdges}
      {connectingLine}
    </svg>
  );
}
