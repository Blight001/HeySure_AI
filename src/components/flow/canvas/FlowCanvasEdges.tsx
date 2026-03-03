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

      // 动态判断连线方向与控制点计算
      // 1. 确定端口的基础方向向量
      const sourceDir = isSourceReversed ? -1 : 1; // 1 = Right, -1 = Left
      const targetDir = isTargetReversed ? 1 : -1; // -1 = Left (Input standard), 1 = Right (Input reversed)

      const deltaX = targetX - sourceX;
      const deltaY = targetY - sourceY;
      const dist = Math.sqrt(deltaX ** 2 + deltaY ** 2);

      // 2. 智能计算控制点偏移量 (Smart Bezier)
      // 基础偏移：基于水平距离，但也受总距离影响
      let controlDist = Math.abs(deltaX) * 0.5;

      // 场景 A: 垂直排列优化
      // 当水平距离较近，但垂直距离较远时，强制增加水平伸出距离，形成 S 型
      if (Math.abs(deltaX) < 150 && Math.abs(deltaY) > 30) {
          controlDist = Math.max(Math.abs(deltaX) * 0.8, Math.min(Math.abs(deltaY) * 0.4, 150));
      }

      // 场景 B: 回环优化 (Loopback)
      // 判断是否发生“视觉回环”：即目标在源的“后方”
      // 对于标准布局(L->R)，targetX < sourceX 即为回环
      const isLoopback = (sourceDir === 1 && targetX < sourceX) || (sourceDir === -1 && targetX > sourceX);
      
      if (isLoopback) {
          controlDist = Math.max(Math.abs(deltaX) * 0.6, Math.min(Math.abs(deltaY) * 0.6, 200));
          controlDist = Math.max(controlDist, 120);
      } else {
          controlDist = Math.max(controlDist, 60);
      }

      // 3. 生成贝塞尔路径
      const c1x = sourceX + sourceDir * controlDist;
      const c1y = sourceY;
      const c2x = targetX + targetDir * controlDist;
      const c2y = targetY;

      const pathD = `M ${sourceX} ${sourceY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${targetX} ${targetY}`;
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
    const isSourceReversed = sourceNode.data?.layout === 'reversed';
    
    let startX = isSourceReversed ? sourceNode.position.x : sourceNode.position.x + sourceSize.width;
    let startY = calculatePortY(sourceNode.position.y, 0, 1, sourceSize.height);
    
    if (connectionState.sourceHandleType === 'input') {
      startX = isSourceReversed ? sourceNode.position.x + sourceSize.width : sourceNode.position.x;
      const idx = sourceNode.inputs.findIndex(i => i.id === connectionState.sourceHandleId);
      if (idx !== -1) startY = calculatePortY(sourceNode.position.y, idx, sourceNode.inputs.length, sourceSize.height);
    } else {
      startX = isSourceReversed ? sourceNode.position.x : sourceNode.position.x + sourceSize.width;
      const idx = sourceNode.outputs.findIndex(o => o.id === connectionState.sourceHandleId);
      if (idx !== -1) startY = calculatePortY(sourceNode.position.y, idx, sourceNode.outputs.length, sourceSize.height);
    }

    // 动态计算控制点方向
    // Determine source direction based on handle type and layout
    let sourceDir = 1;
    if (connectionState.sourceHandleType === 'input') {
        sourceDir = isSourceReversed ? 1 : -1;
    } else {
        sourceDir = isSourceReversed ? -1 : 1;
    }

    const deltaX = connectionState.mouseX - startX;
    const deltaY = connectionState.mouseY - startY;
    const dist = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    
    // 智能偏移量计算
    let controlDist = Math.abs(deltaX) * 0.5;

    // 场景 A: 垂直排列优化
    if (Math.abs(deltaX) < 150 && Math.abs(deltaY) > 30) {
        controlDist = Math.max(Math.abs(deltaX) * 0.8, Math.min(Math.abs(deltaY) * 0.4, 150));
    }

    // 场景 B: 回环优化
    // 鼠标是否在源的"后方"
    const isLoopback = (sourceDir === 1 && deltaX < 0) || (sourceDir === -1 && deltaX > 0);

    if (isLoopback) {
        controlDist = Math.max(Math.abs(deltaX) * 0.6, Math.min(Math.abs(deltaY) * 0.6, 200));
        controlDist = Math.max(controlDist, 120);
    } else {
        controlDist = Math.max(controlDist, 60);
    }

    // 目标方向 (鼠标端)
    // 总是试图以相反方向进入，形成平滑曲线
    // 如果鼠标在右边 (deltaX > 0)，targetDir 应为 -1 (向左伸出控制点)
    // 如果鼠标在左边 (deltaX < 0)，targetDir 应为 1 (向右伸出控制点)
    // 但如果发生了回环，我们可能希望保持方向一致以形成 C 型
    
    let targetDir = deltaX > 0 ? -1 : 1;
    if (isLoopback) {
         // 在回环情况下，如果源向右且鼠标在左，鼠标端控制点应该向右 (1)，这样形成 C 型
         // 如果源向左且鼠标在右，鼠标端控制点应该向左 (-1)
         targetDir = sourceDir; 
    }

    const c1x = startX + sourceDir * controlDist;
    const c1y = startY;
    const c2x = connectionState.mouseX + targetDir * controlDist;
    const c2y = connectionState.mouseY;

    const pathD = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${connectionState.mouseX} ${connectionState.mouseY}`;

    return <path d={pathD} stroke="#3b82f6" strokeWidth={connectionStrokeWidth} strokeDasharray="5,5" fill="none" className="pointer-events-none" />;
  }, [connectionState, nodes, nodeSizes, connectionStrokeWidth]);

  return (
    <svg className="absolute inset-0 overflow-visible pointer-events-none" style={{ zIndex: 0 }}>
      {renderEdges}
      {connectingLine}
    </svg>
  );
}
