import type { FlowUpdateAction } from '@/components/flow/hooks/useFlowAI';
import type { MindmapUpdateAction } from '@/components/mindmap/types';

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

function sanitizeJsonText(text: string): string {
  return removeTrailingCommas(stripCodeFences(text));
}

function extractJsonStringsByBalance(text: string, startChar: '{' | '[', endChar: '}' | ']'): string[] {
  const results: string[] = [];
  let startIndex = text.indexOf(startChar);
  while (startIndex !== -1) {
    let balance = 0;
    let endIndex = -1;
    let inString = false;
    let escape = false;

    for (let i = startIndex; i < text.length; i++) {
      const ch = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === startChar) balance++;
      if (ch === endChar) balance--;
      if (balance === 0) {
        endIndex = i;
        break;
      }
    }

    if (endIndex !== -1) {
      results.push(text.slice(startIndex, endIndex + 1));
      startIndex = text.indexOf(startChar, endIndex + 1);
    } else {
      break;
    }
  }
  return results;
}

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function extractAllJsonValuesFromText(text: string): any[] {
  const sanitized = sanitizeJsonText(text);
  const blocks = [
    ...extractJsonStringsByBalance(sanitized, '[', ']'),
    ...extractJsonStringsByBalance(sanitized, '{', '}')
  ];

  const parsed: any[] = [];
  for (const block of blocks) {
    const val = tryParseJson(sanitizeJsonText(block));
    if (val !== null) parsed.push(val);
  }
  return parsed;
}

function normalizeToActionArray(values: any[]): any[] {
  const actions: any[] = [];
  for (const v of values) {
    if (Array.isArray(v)) actions.push(...v);
    else if (v && typeof v === 'object') actions.push(v);
  }
  return actions;
}

function readActionType(item: any): string {
  return (
    item?.type ||
    item?.action ||
    item?.op ||
    item?.操作 ||
    item?.operation ||
    item?.指令 ||
    ''
  );
}

function normalizeString(value: any): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeCommand(value: any): 'run' | 'pause' | 'stop' {
  const v = normalizeString(value).toLowerCase();
  if (v === 'run' || v === 'start' || v === 'continue' || v === 'resume' || v === '开始' || v === '运行' || v === '继续') return 'run';
  if (v === 'pause' || v === '暂停') return 'pause';
  return 'stop';
}

function normalizeFlowType(value: any): string {
  const t = normalizeString(value);
  if (t === '开始') return 'start';
  if (t === '结束') return 'end';
  if (t === '用户输入') return 'userInput';
  if (t === 'AI对话') return 'ai';
  if (t === '文本显示') return 'textDisplay';
  if (t === '开关') return 'switch';
  if (t === '触发器') return 'trigger';
  return t;
}

export function extractFlowUpdateActionsFromText(
  content: string,
  idMapping: { aiToReal: Map<string, string> }
): FlowUpdateAction[] {
  const values = extractAllJsonValuesFromText(content);
  const items = normalizeToActionArray(values);

  const typeMap: Record<string, FlowUpdateAction['type']> = {
    addNode: 'addNode',
    deleteNode: 'deleteNode',
    addEdge: 'addEdge',
    deleteEdge: 'deleteEdge',
    updateNodeData: 'updateNodeData',
    controlExecution: 'controlExecution',
    openFlow: 'openFlow',
    添加节点: 'addNode',
    删除节点: 'deleteNode',
    添加连线: 'addEdge',
    删除连线: 'deleteEdge',
    修改节点数据: 'updateNodeData',
    控制运行: 'controlExecution',
    打开流程: 'openFlow',
    切换流程: 'openFlow'
  };

  const actions: FlowUpdateAction[] = [];
  for (const item of items) {
    const rawType = readActionType(item);
    const mappedType = typeMap[rawType] || rawType;
    const domain = normalizeString(item?.domain || item?.target);
    const type = domain ? `${domain}.${mappedType}` : mappedType;
    const finalType = type.startsWith('flow.') ? type.slice(5) : type;

    const mapped: any = { type: finalType };

    const nodeId = normalizeString(item?.nodeId || item?.节点ID);
    const edgeId = normalizeString(item?.edgeId || item?.连线ID);
    const sourceId = normalizeString(item?.sourceId || item?.源节点ID);
    const targetId = normalizeString(item?.targetId || item?.目标节点ID);

    if (finalType === 'addNode') {
      mapped.nodeType = normalizeFlowType(item?.nodeType || item?.节点类型);
      mapped.label = item?.label || item?.标签;
      mapped.x = item?.x;
      mapped.y = item?.y;
      mapped.description = item?.description || item?.说明;
      if (nodeId) mapped.nodeId = nodeId;
    }

    if (finalType === 'deleteNode') {
      mapped.nodeId = nodeId;
      mapped.description = item?.description || item?.说明;
    }

    if (finalType === 'addEdge') {
      mapped.sourceId = sourceId;
      mapped.targetId = targetId;
      mapped.sourceHandle = item?.sourceHandle || item?.源句柄;
      mapped.targetHandle = item?.targetHandle || item?.目标句柄;
      mapped.description = item?.description || item?.说明;
      if (edgeId) mapped.edgeId = edgeId;
    }

    if (finalType === 'deleteEdge') {
      mapped.edgeId = edgeId;
      mapped.description = item?.description || item?.说明;
    }

    if (finalType === 'updateNodeData') {
      mapped.nodeId = nodeId;
      mapped.data = item?.data || item?.数据 || {};
      mapped.description = item?.description || item?.说明;
    }

    if (finalType === 'controlExecution') {
      mapped.command = normalizeCommand(item?.command || item?.命令);
      mapped.description = item?.description || item?.说明;
    }

    if (finalType === 'openFlow') {
      mapped.flowId = item?.flowId || item?.流程ID;
      mapped.description = item?.description || item?.说明;
    }

    const remapId = (v: any) => idMapping.aiToReal.get(String(v)) || v;
    if (mapped.nodeId) mapped.nodeId = remapId(mapped.nodeId);
    if (mapped.sourceId) mapped.sourceId = remapId(mapped.sourceId);
    if (mapped.targetId) mapped.targetId = remapId(mapped.targetId);
    if (mapped.edgeId) mapped.edgeId = remapId(mapped.edgeId);

    if (
      mapped.type === 'addNode' ||
      mapped.type === 'deleteNode' ||
      mapped.type === 'addEdge' ||
      mapped.type === 'deleteEdge' ||
      mapped.type === 'updateNodeData' ||
      mapped.type === 'controlExecution' ||
      mapped.type === 'openFlow'
    ) {
      actions.push(mapped as FlowUpdateAction);
    }
  }

  return actions;
}

export function extractMindmapUpdateActionsFromText(content: string): MindmapUpdateAction[] {
  const values = extractAllJsonValuesFromText(content);
  const items = normalizeToActionArray(values);

  const actions: MindmapUpdateAction[] = [];
  for (const item of items) {
    const rawType = normalizeString(readActionType(item)).toLowerCase();
    const domain = normalizeString(item?.domain || item?.target);
    const type = domain ? `${domain}.${rawType}` : rawType;
    const finalType = type.startsWith('mindmap.') ? type.slice(8) : type;

    if (finalType === 'rename') {
      actions.push({
        type: 'rename',
        nodeId: normalizeString(item?.nodeId || item?.节点ID),
        name: item?.name || item?.新名称 || item?.名称
      } as MindmapUpdateAction);
    }

    if (finalType === 'add') {
      actions.push({
        type: 'add',
        parentId: normalizeString(item?.parentId || item?.父ID || item?.父节点ID),
        name: item?.name || item?.名称
      } as MindmapUpdateAction);
    }

    if (finalType === 'delete') {
      actions.push({
        type: 'delete',
        nodeId: normalizeString(item?.nodeId || item?.节点ID)
      } as MindmapUpdateAction);
    }

    if (finalType === 'move') {
      actions.push({
        type: 'move',
        nodeId: normalizeString(item?.nodeId || item?.节点ID),
        newParentId: normalizeString(item?.newParentId || item?.新父ID || item?.新父节点ID),
        index: item?.index
      } as MindmapUpdateAction);
    }
  }

  return actions;
}

