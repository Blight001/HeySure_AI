export type WorkflowRunnerCommand = 'start' | 'pause' | 'stop' | 'list';

export type WorkflowRunnerOutputMode = 'default' | 'all_text';

export type ParsedWorkflowRunnerPayload = {
  command: WorkflowRunnerCommand;
  flowName: string;
  input: any;
  outputMode: WorkflowRunnerOutputMode;
};

export type MindmapInfoCommand = 'get' | 'list';

export type ParsedMindmapInfoPayload = {
  command: MindmapInfoCommand;
  mapName: string;
  nodeName: string;
  depth: number;
};

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  const end = trimmed.lastIndexOf('```');
  if (end <= 0) return trimmed;
  const inner = trimmed.slice(3, end).trimStart();
  const firstLineEnd = inner.indexOf('\n');
  if (firstLineEnd === -1) return inner.trim();
  const firstLine = inner.slice(0, firstLineEnd).trim();
  const rest = inner.slice(firstLineEnd + 1);
  if (/^(json|javascript|js|ts|typescript)$/i.test(firstLine)) return rest.trim();
  return inner.trim();
}

function removeTrailingCommas(text: string): string {
  return text.replace(/,\s*([\]}])/g, '$1');
}

function tryParseJson(text: string): any | null {
  const raw = removeTrailingCommas(stripCodeFences(text));
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toInt(value: any, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeObjectPayload(payload: any): any {
  if (payload && typeof payload === 'object') return payload;
  if (typeof payload !== 'string') return null;
  const text = payload.trim();
  if (!text) return null;
  const parsed = tryParseJson(text);
  return parsed && typeof parsed === 'object' ? parsed : null;
}

export function parseWorkflowRunnerPayload(payload: any, fallbackFlowName: string = ''): ParsedWorkflowRunnerPayload {
  const parsedObject = normalizeObjectPayload(payload);
  let command: WorkflowRunnerCommand = 'start';
  let flowName = '';
  let input = payload;
  let outputMode: WorkflowRunnerOutputMode = 'default';

  if (parsedObject) {
    const type = parsedObject.type;
    const rawCommand = parsedObject.command;

    // 统一协议: type + command
    if (type === 'workflow' || type === 'controlExecution') {
      command = rawCommand === 'run' ? 'start' : (rawCommand || 'start');
      flowName = parsedObject.flowName || parsedObject.name || '';
      input = parsedObject.input ?? parsedObject.data;
      outputMode = parsedObject.outputMode || 'default';
    } 
    // 兼容旧格式: flowName + command
    else if (parsedObject.flowName || parsedObject.name) {
      flowName = parsedObject.flowName || parsedObject.name;
      command = parsedObject.command || 'start';
      input = parsedObject.input ?? parsedObject;
      outputMode = parsedObject.outputMode || 'default';
    } 
    // 兼容 list 命令对象
    else if (parsedObject.command === 'list') {
      command = 'list';
      flowName = '';
      input = parsedObject.input ?? parsedObject;
      outputMode = parsedObject.outputMode || 'default';
    } 
    // 其他对象情况
    else {
      flowName = fallbackFlowName;
    }
  } else if (typeof payload === 'string') {
    // 简单字符串模式: 视为 flowName
    const trimmed = payload.trim();
    if (trimmed === 'list' || trimmed === 'files') {
        command = 'list';
        flowName = '';
    } else {
        flowName = trimmed;
    }
  } else {
    flowName = fallbackFlowName;
  }

  // 规范化
  if (flowName === 'list') {
    command = 'list';
    flowName = '';
  }

  if (!flowName && command !== 'list') {
    flowName = fallbackFlowName;
  }

  if (command !== 'start' && command !== 'pause' && command !== 'stop' && command !== 'list') {
    command = 'start';
  }

  if (outputMode !== 'default' && outputMode !== 'all_text') {
    outputMode = 'default';
  }

  return { command, flowName, input, outputMode };
}

export function parseMindmapInfoPayload(
  payload: any,
  options?: { currentNodeNames?: string[] }
): ParsedMindmapInfoPayload {
  const currentNodeNames = options?.currentNodeNames || [];
  const parsedObject = normalizeObjectPayload(payload);

  let command: MindmapInfoCommand = 'get';
  let mapName = '';
  let nodeName = '';
  let depth = 1;

  if (parsedObject) {
    const type = parsedObject.type;
    const rawCommand = parsedObject.command;

    // 统一协议: type + command
    if (type === 'mindmap' || type === 'mindmapInfo') {
      if (rawCommand === 'list' || rawCommand === 'files') {
        command = 'list';
      } else {
        command = 'get';
        mapName = parsedObject.mapName || parsedObject.map || '';
        nodeName = parsedObject.nodeName || parsedObject.node || '';
        if (parsedObject.depth !== undefined) depth = toInt(parsedObject.depth, 1);
      }
    } 
    // 兼容旧格式: map/node 属性
    else if (parsedObject.map || parsedObject.node || parsedObject.mapName || parsedObject.nodeName) {
      command = 'get';
      mapName = parsedObject.mapName || parsedObject.map || '';
      nodeName = parsedObject.nodeName || parsedObject.node || '';
      if (parsedObject.depth !== undefined) depth = toInt(parsedObject.depth, 1);
    }
  }

  // 字符串指令解析
  if (!parsedObject && typeof payload === 'string' && payload.trim()) {
    const p = payload.trim();

    if (/^(files|list|ls|文件列表|导图列表)$/i.test(p)) {
      command = 'list';
      return { command, mapName, nodeName, depth };
    }

    const mapMatch = p.match(/(?:map|导图)[:：]\s*([^\s]+)/i);
    if (mapMatch) mapName = mapMatch[1];

    const nodeMatch = p.match(/(?:node|节点)[:：]\s*([^\s]+)/i);
    if (nodeMatch) nodeName = nodeMatch[1];

    const depthMatch = p.match(/(?:depth|深度|level|层级)[:：]\s*(\d+)/i);
    if (depthMatch) depth = toInt(depthMatch[1], 1);

    // 如果仅有节点名称 (简写模式)
    if (!nodeName && !mapMatch && !depthMatch && currentNodeNames.includes(p)) {
      nodeName = p;
    }

    if (mapMatch || nodeMatch || depthMatch || nodeName) {
      command = 'get';
    }
  }

  if (depth < 1) depth = 1;

  return { command, mapName, nodeName, depth };
}

