// ============ 流程编辑器常量 ============

// 最大历史记录数量
export const MAX_HISTORY = 50;

// 节点默认尺寸
export const DEFAULT_NODE_WIDTH = 150;
export const DEFAULT_NODE_HEIGHT = 80;

// 画布默认设置
export const DEFAULT_ZOOM = 1;
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.1;
export const DEFAULT_ANIMATION_SPEED = 1.5;

// 网格设置
export const GRID_SIZE = 20;
export const GRID_OPACITY = 0.1;

// 节点类型图标映射
export const NODE_TYPE_ICONS: Record<string, string> = {
  start: '🟢',
  end: '🔴',
  userInput: '👤',
  aiChat: '🤖',
  condition: '🔀',
  parallel: '⚡',
  aggregate: '📥',
  python: '🐍',
  loop: '🔄',
  llmJudge: '⚖️',
  tool: '🛠️',
  variable: '📦',
  math: '🔢',
  template: '📝',
  code: '💻',
  workflowRunner: '⚙️',
};

// 节点类型标签映射
export const NODE_TYPE_LABELS: Record<string, string> = {
  start: '开始',
  end: '结束',
  userInput: '用户输入',
  aiChat: 'AI对话',
  condition: '条件分支',
  parallel: '并行执行',
  aggregate: '聚合汇总',
  python: 'Python',
  loop: '循环',
  llmJudge: 'LLM判断',
  tool: '工具',
  variable: '变量',
  math: '数学运算',
  template: '模板',
  code: '代码',
  workflowRunner: '操作流程',
};

// 快捷键映射
export const KEYBOARD_SHORTCUTS = {
  UNDO: ['ctrl', 'z'],
  REDO: ['ctrl', 'y'],
  DELETE: ['delete', 'backspace'],
  SAVE: ['ctrl', 's'],
  RUN: ['ctrl', 'enter'],
  ZOOM_IN: ['ctrl', '='],
  ZOOM_OUT: ['ctrl', '-'],
  RESET_VIEW: ['ctrl', '0'],
};

// 拖拽类型
export const DRAG_TYPES = {
  BASIC: 'basic',
  CONDITION: 'condition',
  PARALLEL: 'parallel',
  AGGREGATE: 'aggregate',
  AI_CHAT: 'aiChat',
  PYTHON: 'python',
  CANVAS_NODE_MOVE: 'canvas-node-move',
  CONNECTION: 'connection',
} as const;

// 节点分类
export const NODE_CATEGORIES = {
  BASIC: 'basic',
  LOGIC: 'logic',
  AI: 'ai',
  PYTHON: 'python',
} as const;

// 端口类型
export const PORT_TYPES = {
  INPUT: 'input',
  OUTPUT: 'output',
} as const;

// 数据类型
export const DATA_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object',
  ANY: 'any',
} as const;

// 节点类型分类映射
export const NODE_TYPE_CATEGORY: Record<string, string> = {
  start: 'basic',
  end: 'basic',
  userInput: 'basic',
  condition: 'logic',
  parallel: 'logic',
  aggregate: 'logic',
  aiChat: 'ai',
  python: 'python',
  loop: 'logic',
  llmJudge: 'ai',
  tool: 'python',
  variable: 'basic',
  math: 'python',
  template: 'basic',
  code: 'python',
  workflowRunner: 'basic',
};

