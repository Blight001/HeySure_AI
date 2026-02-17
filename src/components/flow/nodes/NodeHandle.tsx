/**
 * HeySure AI - 节点连接端口组件
 * 流程节点的输入/输出连接点：
 * - 输入端口（左侧）和输出端口（右侧）
 * - 连接状态高亮显示
 * - 点击连接交互
 * - 端口类型显示
 * - 悬浮提示信息
 */
// ============ 节点端口（连接点）组件 ============
import type { NodePort } from '@/types/flow';

interface NodeHandleProps {
  port: NodePort;
  isConnecting: boolean;
  isSourceConnecting: boolean;
  isTargetNode: boolean;
  onClick: () => void;
  position: 'input' | 'output';
}

export function NodeHandle({
  port,
  isConnecting,
  isSourceConnecting,
  isTargetNode,
  onClick,
  position
}: NodeHandleProps) {
  const isInput = position === 'input';
  // const marginClass = isInput ? '-ml-2' : '-mr-2'; // 不再需要负边距，由父容器定位

  // 高亮样式
  const highlightClass = isConnecting && isTargetNode
    ? 'hover:bg-green-500 hover:border-green-500'
    : '';

  // 源节点连接中样式
  const sourceConnectingClass = isConnecting && isSourceConnecting
    ? 'ring-2 ring-blue-500'
    : '';

  // 箭头方向
  const arrowDirection = isInput ? 'I' : 'O';

  return (
    <div
      className={`w-5 h-5 flex items-center justify-center bg-primary/80 rounded cursor-pointer border-2 border-background hover:bg-primary hover:scale-110 transition-all ${highlightClass} ${sourceConnectingClass}`}
      title={port.label}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="text-[8px] text-white leading-none">{arrowDirection}</span>
    </div>
  );
}

