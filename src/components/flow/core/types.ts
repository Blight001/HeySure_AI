// ============ 流程编辑器核心类型 ============
import type { FlowNode, FlowEdge, FlowNodeType, NodePort } from '@/types/flow';
export type { FlowNode, FlowEdge, FlowNodeType, NodePort };

// 拖拽数据类型
export interface DragData {
  type: 'basic' | 'condition' | 'parallel' | 'aggregate' | 'aiChat' | 'python' | 'model' | 'canvas-node-move' | 'connection' | 'switch' | 'trigger' | 'simpleTrigger';
  nodeType?: FlowNodeType;
  component?: PythonComponent;
  model?: ModelConfig;
  label?: string;
  icon?: string;
  nodeId?: string;
  sourceNodeId?: string;
  sourceHandleId?: string;
}

// 连接状态类型
export interface ConnectionState {
  isConnecting: boolean;
  sourceNodeId: string | null;
  sourceHandleId: string | null;
  sourceHandleType: 'input' | 'output' | null;
  mouseX: number;
  mouseY: number;
}

// 画布视图状态
export interface CanvasViewState {
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
}

// 历史记录项
export interface HistoryItem {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// 模型配置类型
export interface ModelConfig {
  id: string;
  name: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  enableMultiTurn: boolean;
  enableStreaming: boolean;
  enableThinking: boolean;
  enableWebSearch: boolean;
  enableWebScraping: boolean;
  enabled: boolean;
}

// Python 组件类型引用
import type { PythonComponent } from '@/types/flow';

// ============ ID 生成器 ============
export const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const generateEdgeId = () => `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============ 节点类型信息 ============
export interface NodeTypeInfo {
  type: FlowNodeType;
  label: string;
  icon: string;
  category: 'basic' | 'logic' | 'ai' | 'python';
  defaultInputs?: NodePort[];
  defaultOutputs?: NodePort[];
}

export const BASIC_NODE_TYPES: NodeTypeInfo[] = [
  { type: 'start', label: '开始', icon: '🟢', category: 'basic', defaultInputs: [], defaultOutputs: [{ id: 'output', type: 'output', label: '输出' }] },
  { type: 'end', label: '结束', icon: '🔴', category: 'basic', defaultInputs: [{ id: 'input', type: 'input', label: '输入' }], defaultOutputs: [] },
  { type: 'userInput', label: '用户输入', icon: '👤', category: 'basic', defaultInputs: [], defaultOutputs: [{ id: 'output', type: 'output', label: '输出' }] },
  { type: 'textDisplay', label: '文本显示', icon: '📄', category: 'basic', defaultInputs: [{ id: 'input', type: 'input', label: '输入' }], defaultOutputs: [{ id: 'output', type: 'output', label: '输出' }] },
];

export const LOGIC_NODE_TYPES: NodeTypeInfo[] = [
  { type: 'condition', label: '条件分支', icon: '🔀', category: 'logic', defaultInputs: [{ id: 'input', type: 'input', label: '输入' }], defaultOutputs: [{ id: 'true', type: 'output', label: '是' }, { id: 'false', type: 'output', label: '否' }] },
  { type: 'parallel', label: '并行执行', icon: '⚡', category: 'logic', defaultInputs: [{ id: 'input', type: 'input', label: '输入' }], defaultOutputs: [{ id: 'output1', type: 'output', label: '分支1' }, { id: 'output2', type: 'output', label: '分支2' }] },
  { type: 'aggregate', label: '聚合汇总', icon: '📥', category: 'logic', defaultInputs: [{ id: 'input1', type: 'input', label: '输入1' }, { id: 'input2', type: 'input', label: '输入2' }], defaultOutputs: [{ id: 'output', type: 'output', label: '输出' }] },
];

// ============ 节点创建工厂函数 ============
export function createBasicNode(type: FlowNodeType, position: { x: number; y: number }, label: string, icon: string): FlowNode {
  const nodeTypeInfo = BASIC_NODE_TYPES.find(n => n.type === type);
  return {
    id: generateId(),
    type,
    position,
    data: { label, icon },
    inputs: nodeTypeInfo?.defaultInputs || [],
    outputs: nodeTypeInfo?.defaultOutputs || [],
  };
}

export function createConditionNode(position: { x: number; y: number }): FlowNode {
  return {
    id: generateId(),
    type: 'condition',
    position,
    data: { label: '条件分支' },
    inputs: [{ id: 'input', type: 'input', label: '输入' }],
    outputs: [
      { id: 'true', type: 'output', label: '是' },
      { id: 'false', type: 'output', label: '否' }
    ]
  };
}

export function createParallelNode(position: { x: number; y: number }): FlowNode {
  return {
    id: generateId(),
    type: 'parallel',
    position,
    data: { label: '并行执行' },
    inputs: [{ id: 'input', type: 'input', label: '输入' }],
    outputs: [
      { id: 'output1', type: 'output', label: '分支1' },
      { id: 'output2', type: 'output', label: '分支2' }
    ]
  };
}

export function createAggregateNode(position: { x: number; y: number }): FlowNode {
  return {
    id: generateId(),
    type: 'aggregate',
    position,
    data: { label: '聚合汇总' },
    inputs: [
      { id: 'input1', type: 'input', label: '输入1' },
      { id: 'input2', type: 'input', label: '输入2' }
    ],
    outputs: [{ id: 'output', type: 'output', label: '输出' }]
  };
}

export function createAIChatNode(position: { x: number; y: number }, model?: ModelConfig): FlowNode {
  return {
    id: generateId(),
    type: 'aiChat',
    position,
    data: {
      label: model?.name || 'AI对话',
      modelId: model?.id,
      model: model?.model,
      useMemory: true, // 默认开启上下文记忆
      messages: [], // 对话历史
    },
    inputs: [{ id: 'input', type: 'input', label: '用户输入' }],
    outputs: [{ id: 'output', type: 'output', label: 'AI回复' }]
  };
}

export function createPythonNode(
  position: { x: number; y: number },
  component: PythonComponent,
  unifiedInput: boolean = false
): FlowNode {
  // 如果是统一输入模式，只有一个输入端口
  // 如果组件没有定义参数，至少保留一个通用输入端口
  const hasInputs = component.inputs && component.inputs.length > 0;
  const inputs = unifiedInput
    ? [{ id: 'jsonInput', type: 'input' as const, label: 'JSON数据', dataType: 'object' }]
    : hasInputs
      ? component.inputs.map((input, idx) => ({
          id: input.id || `input${idx}`,
          type: 'input' as const,
          label: input.label || input.name,
          dataType: input.dataType
        }))
      : [{ id: 'input', type: 'input' as const, label: '输入', dataType: 'any' }];

  return {
    id: generateId(),
    type: 'python',
    position,
    data: {
      label: component.name.split(' - ').pop() || component.name,
      componentId: component.id,
      filePath: component.filePath,
      functionName: component.functionName,
      unifiedInput, // 存储当前模式
      componentInputs: component.inputs, // 保存原始输入定义用于解析
      componentOutputs: component.outputs // 保存原始输出定义
    },
    inputs,
    outputs: component.outputs.map((output, idx) => ({
      id: output.id || `output${idx}`,
      type: 'output' as const,
      label: output.label || output.name,
      dataType: output.dataType
    }))
  };
}

// ============ 开关节点创建函数 ============
export function createSwitchNode(position: { x: number; y: number }, label: string = '开关'): FlowNode {
  return {
    id: generateId(),
    type: 'switch',
    position,
    data: {
      label,
      isOn: false,
      pendingSignal: undefined,
      hasPendingSignal: false,
      lastSignalTime: undefined
    },
    inputs: [
      { id: 'input', type: 'input', label: '输入' }
    ],
    outputs: [
      { id: 'output', type: 'output', label: '输出' }
    ]
  };
}

// ============ 触发器节点创建函数 ============
export function createTriggerNode(position: { x: number; y: number }, label: string = '触发器'): FlowNode {
  return {
    id: generateId(),
    type: 'trigger',
    position,
    data: {
      label,
      triggerType: 'manual', // 'manual' | 'scheduled'
      scheduleInterval: 5,   // 定时触发间隔（秒）
      triggerCount: 0,
      lastTriggerTime: undefined
    },
    inputs: [],
    outputs: [
      { id: 'output', type: 'output', label: '触发信号' }
    ]
  };
}

// ============ 简单触发按钮节点创建函数 ============
export function createSimpleTriggerNode(position: { x: number; y: number }, label: string = '按钮'): FlowNode {
  return {
    id: generateId(),
    type: 'simpleTrigger',
    position,
    data: {
      label,
      triggerCount: 0,
      lastTriggerTime: undefined
    },
    inputs: [],
    outputs: [
      { id: 'output', type: 'output', label: '信号' }
    ]
  };
}

// ============ 连接工厂函数 ============
export function createEdge(
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string
): FlowEdge {
  return {
    id: generateEdgeId(),
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'default',
    style: { stroke: '#64748b', strokeWidth: 2 }
  };
}

