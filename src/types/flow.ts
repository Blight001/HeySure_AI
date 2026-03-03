/**
 * HeySure AI - 流程类型定义
 * 定义流程编排相关的数据结构：
 * - FlowDefinition: 流程定义
 * - FlowNode: 流程节点
 * - FlowEdge: 流程连线
 * - FlowNodeType: 节点类型
 * - FlowVariable: 流程变量
 * - PythonFunctionInfo: Python函数信息
 */
import { ThemeConfig } from './theme';

// ============ 流程类型 ============

// 流程分类
export interface FlowCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

// 流程视图状态
export interface FlowViewState {
  zoom: number;           // 缩放级别
  pan: { x: number; y: number };  // 平移位置
  animationSpeed: number; // 动画速度
  showGrid: boolean;      // 是否显示网格
  connectionStrokeWidth: number;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables?: FlowVariable[];
  settings: FlowSettings;
  metadata: FlowMetadata;
  viewState?: FlowViewState;  // 视图状态
  theme?: ThemeConfig;        // 主题配置
  aiConfig?: {
    selectedModelId: string;
    allowReadFlow: boolean;
    allowAiEdit: boolean;
    allowAiAutoExecution: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

export interface LocalModelConfig {
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

export interface FlowSettings {
  executionMode: 'sync' | 'async';
  timeout: number;
  retryOnError: boolean;
  maxRetries: number;
}

export interface FlowMetadata {
  author?: string;
  tags?: string[];
  isTemplate: boolean;
  templateCategory?: string;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: NodeData;
  inputs: NodePort[];
  outputs: NodePort[];
  width?: number;
  height?: number;
  selected?: boolean;
  dragging?: boolean;
  valid?: boolean;
  error?: string;
}

export type FlowNodeType =
  | 'start'
  | 'end'
  | 'classifier'
  | 'userInput'
  | 'textDisplay'
  | 'aiChat'
  | 'condition'
  | 'parallel'
  | 'aggregate'
  | 'loop'
  | 'llmJudge'
  | 'tool'
  | 'variable'
  | 'math'
  | 'template'
  | 'code'
  | 'python'  // Python自定义节点
  | 'switch'  // 开关节点：暂存信号，打开后发送
  | 'trigger' // 触发器节点：按钮触发，预留信号通信
  | 'simpleTrigger' // 简单触发按钮：单纯发送信号
  | 'mindmapInfo' // 思维导图信息组件：获取当前思维导图信息
  | 'workflowRunner'; // 操作流程执行器

export interface NodeData {
  [key: string]: any;
}

export interface NodePort {
  id: string;
  type: 'input' | 'output';
  label?: string;
  position?: 'left' | 'right' | 'top' | 'bottom';
  visible?: boolean;
  allowMultiple?: boolean;
  dataType?: string;  // 数据类型：string, number, boolean, array, object
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: 'default' | 'conditional' | 'smooth' | 'step';
  label?: string;
  animated?: boolean;
  style?: EdgeStyle;
}

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}

export interface FlowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue?: any;
  description?: string;
}

// ============ Python组件类型 ============
export interface PythonComponent {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: PythonComponentCategory;
  filePath: string;           // Python文件路径
  functionName: string;       // 入口函数名
  enabled: boolean;
  config: PythonComponentConfig;
  inputs: PythonPortConfig[];   // 输入端口定义
  outputs: PythonPortConfig[];  // 输出端口定义
  aiControl: AIControlRule[];   // AI控制规则
  createdAt: number;
  updatedAt: number;
}

export type PythonComponentCategory = 
  | 'data_processing'   // 数据处理
  | 'text_analysis'     // 文本分析
  | 'web_search'        // 网络搜索
  | 'file_operation'    // 文件操作
  | 'math_calculator'   // 数学计算
  | 'ai_tool'           // AI工具
  | 'custom';           // 自定义

export interface PythonComponentConfig {
  timeout: number;              // 执行超时时间(秒)
  requireApproval: boolean;     // 是否需要用户确认
  allowedImports: string[];     // 允许导入的模块
  blockedImports: string[];     // 禁止导入的模块
  environmentVars?: Record<string, string>;  // 环境变量
  memoryLimit?: number;         // 内存限制(MB)
}

export interface PythonPortConfig {
  id: string;
  name: string;
  label: string;
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

// AI控制规则 - 决定AI如何调用和使用这个组件
export interface AIControlRule {
  id: string;
  name: string;
  description: string;
  priority: number;                    // 优先级(数字越大优先级越高)
  enabled: boolean;
  
  // 触发条件
  triggers: AIControlTrigger[];
  
  // 输入规则
  inputRules: InputRule[];
  
  // 输出规则
  outputRules: OutputRule[];
  
  // 限制条件
  limits: ControlLimits;
}

export interface AIControlTrigger {
  type: 'keyword' | 'intent' | 'context' | 'always';
  pattern?: string;                    // 关键词匹配
  intentType?: string;                 // 意图类型
  contextKeys?: string[];              // 上下文变量
}

export interface InputRule {
  portId: string;
  required: boolean;
  typeValidation: boolean;             // 是否验证类型
  valueConstraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowedValues?: any[];
  };
}

export interface OutputRule {
  portId: string;
  exposeToAI: boolean;                 // 是否暴露给AI
  description: string;                 // 输出描述(供AI理解)
  formatHint?: string;                 // 格式提示
}

export interface ControlLimits {
  maxCallsPerExecution: number;        // 每次执行最大调用次数
  maxTotalCalls: number;               // 总调用次数限制(0=无限)
  requireUserPermission: boolean;      // 是否需要用户权限
  allowedRoles?: string[];             // 允许调用的AI角色
}

export interface PythonComponentRegistry {
  components: Map<string, PythonComponent>;
  categories: Map<string, PythonComponentCategory>;
}

// ============ 流程执行类型 ============
export interface ExecutionContext {
  executionId: string;
  flowId: string;
  variables: Map<string, any>;
  messages: any[];  // Message类型定义在其他文件，这里用any避免循环引用
  nodeResults: Map<string, NodeResult>;
  startTime: number;
}

export interface NodeResult {
  success: boolean;
  output: any;
  error?: string;
  executionTime: number;
}

export interface ExecutionResult {
  executionId: string;
  success: boolean;
  output: any;
  error?: string;
  nodeResults: Map<string, NodeResult>;
  totalTokens: number;
  totalCost: number;
  executionTime: number;
}

// ============ Python组件导入/导出 ============
export interface PythonImportRequest {
  filePath: string;
  functionName: string;
  config?: Partial<PythonComponentConfig>;
}

export interface PythonValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  componentInfo?: {
    name: string;
    description: string;
    inputs: PythonPortConfig[];
    outputs: PythonPortConfig[];
  };
}

// Python函数检测结果
export interface PythonFunctionInfo {
  name: string;                    // 函数名
  label?: string;                  // 自定义显示名称
  description: string;             // 函数描述（从docstring提取）
  parameters: PythonParameterInfo[];  // 参数信息
  returns: PythonReturnInfo;       // 返回值信息
  sourceCode?: string;             // 源代码片段
  lineNumber?: number;             // 行号
}

export interface PythonParameterInfo {
  name: string;                    // 参数名
  type: string;                    // 类型注解（字符串形式）
  description: string;             // 参数描述（从docstring提取）
  defaultValue?: any;              // 默认值
  required: boolean;               // 是否必需
}

export interface PythonReturnInfo {
  type: string;                    // 返回类型
  description: string;             // 返回值描述
}

// Python文件检测结果
export interface PythonFileAnalysis {
  filePath: string;                // 原始文件路径
  savedPath: string;               // 保存后的路径
  functions: PythonFunctionInfo[]; // 检测到的函数列表
  className?: string;              // 类名（如果检测到类）
  moduleName: string;              // 模块名
  scriptName?: string;             // 从注释提取的脚本名称
  overallDescription: string;      // 模块整体描述
  contentSource?: 'file' | 'fallback'; // 调试用：标识内容来源
}

// 脚本配置（保存到data/script）
export interface PythonScriptConfig {
  id: string;
  name: string;
  fileName: string;                // 文件名
  savedPath: string;               // 保存路径
  category: PythonComponentCategory;
  description: string;
  functions: PythonFunctionInfo[]; // 选择的函数
  componentConfig: PythonComponentConfig;
  aiControl: AIControlRule[];
  createdAt: number;
  updatedAt: number;
}
