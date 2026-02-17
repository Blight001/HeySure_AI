/**
 * HeySure AI - 流程 AI Hook
 * 处理流程编辑中的 AI 相关功能：
 * - AI 修改建议生成
 * - 待确认变更管理
 * - 节点/边添加/删除/修改操作
 * - AI 执行结果处理
 * - 流程自动优化建议
 */
import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { FlowNode, FlowEdge, FlowNodeType } from '@/types/flow';
import {
  createBasicNode,
  createConditionNode,
  createAIChatNode,
  createParallelNode,
  createAggregateNode,
  generateEdgeId
} from '../core/types';

// Define UpdateAction types
export type FlowUpdateAction = 
  | { type: 'addNode'; nodeType: FlowNodeType; label?: string; x?: number; y?: number; description?: string; nodeId?: string }
  | { type: 'deleteNode'; nodeId: string; description?: string }
  | { type: 'addEdge'; sourceId: string; targetId: string; sourceHandle?: string; targetHandle?: string; description?: string; edgeId?: string }
  | { type: 'deleteEdge'; edgeId: string; description?: string }
  | { type: 'updateNodeData'; nodeId: string; data: Record<string, any>; description?: string }
  | { type: 'controlExecution'; command: 'run' | 'pause' | 'stop'; description?: string }
  | { type: 'openFlow'; flowId: string; description?: string };

export interface PendingFlowChange {
  id: string;
  action: FlowUpdateAction;
  status: 'pending' | 'accepted' | 'rejected';
  description: string;
}

export interface PendingChangesState {
  nodes: Record<string, 'delete' | 'modify' | 'add'>;
  edges: Record<string, 'delete' | 'add'>;
}

interface UseFlowAIProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;
  allowReadFlow: boolean;
  allowAiEdit: boolean;
  allowAiAutoExecution: boolean;
  onNodeDataChange?: (nodeId: string, data: any) => void;
  onControlExecution?: (command: 'run' | 'pause' | 'stop') => void;
  onSwitchFlow?: (flowId: string) => void;
  availableFlows?: { id: string; name: string }[];
}

export const useFlowAI = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  allowReadFlow,
  allowAiEdit,
  allowAiAutoExecution,
  onNodeDataChange,
  onControlExecution,
  onSwitchFlow,
  availableFlows = []
}: UseFlowAIProps) => {
  const { toast } = useToast();
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingFlowChange>>({});
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [floatingChatModel, setFloatingChatModel] = useState<any>(null);
  const [floatingChatPosition, setFloatingChatPosition] = useState({ x: 0, y: 0 });

  // Computed state for highlighting nodes/edges based on pending changes
  const pendingChangeState = useMemo<PendingChangesState>(() => {
    const state: PendingChangesState = { nodes: {}, edges: {} };
    
    Object.values(pendingChanges).forEach(change => {
      const { action } = change;
      switch (action.type) {
        case 'deleteNode':
          state.nodes[action.nodeId] = 'delete';
          break;
        case 'addNode':
          if (action.nodeId) {
            state.nodes[action.nodeId] = 'add';
          }
          break;
        case 'deleteEdge':
          state.edges[action.edgeId] = 'delete';
          break;
        case 'addEdge':
          if (action.edgeId) {
            state.edges[action.edgeId] = 'add';
          }
          break;
      }
    });
    return state;
  }, [pendingChanges]);

  // Generate ID mappings
  const idMapping = useMemo(() => {
    const realToAi = new Map<string, string>();
    const aiToReal = new Map<string, string>();

    nodes.forEach((node, index) => {
      const aiId = (index + 1).toString();
      realToAi.set(node.id, aiId);
      aiToReal.set(aiId, node.id);
    });

    edges.forEach((edge, index) => {
      const aiId = `edge-${index + 1}`;
      realToAi.set(edge.id, aiId);
      aiToReal.set(aiId, edge.id);
    });

    return { realToAi, aiToReal };
  }, [nodes, edges]);

  // Build Markdown representation of the flow
  const buildFlowMarkdown = useCallback((
    currentNodes: FlowNode[], 
    currentEdges: FlowEdge[],
    mapping: { realToAi: Map<string, string> }
  ): string => {
    if (!currentNodes || currentNodes.length === 0) {
      return 'Flow is empty.';
    }

    let markdown = '## 节点\n';
    currentNodes.forEach(node => {
      const aiId = mapping.realToAi.get(node.id) || node.id;
      markdown += `- [${aiId}] 类型: ${node.type}, 标签: ${node.data.label || '未命名'}, 位置: (${Math.round(node.position.x)}, ${Math.round(node.position.y)})\n`;
    });

    markdown += '\n## Edges\n';
    currentEdges.forEach(edge => {
      const aiId = mapping.realToAi.get(edge.id) || edge.id;
      const sourceAiId = mapping.realToAi.get(edge.source) || edge.source;
      const targetAiId = mapping.realToAi.get(edge.target) || edge.target;
      markdown += `- [${aiId}] ${sourceAiId} (${edge.sourceHandle}) -> ${targetAiId} (${edge.targetHandle})\n`;
    });

    return markdown;
  }, []);

  const flowStructureMd = useMemo(() => {
    if (!allowReadFlow) return '';
    const markdown = buildFlowMarkdown(nodes, edges, idMapping);
    return `流程图结构:
${markdown}
请简洁回答用户请求`;
  }, [allowReadFlow, nodes, edges, buildFlowMarkdown, idMapping]);

  const editInstructionsMd = useMemo(() => {
    return `你是一个流程图助手，可以帮助用户修改流程图。
当前流程图包含以下节点和连线（见上文结构）。
如需修改流程，请在回复中附加 JSON 数组格式的操作指令。
操作格式：
1. 添加节点：{"操作": "添加节点", "节点类型": "AI对话", "标签": "AI助手", "x": 100, "y": 100}
   （节点类型支持：开始, 结束, 用户输入, AI对话, 条件, 并行, 聚合, 文本显示, 开关, 触发器）
2. 删除节点：{"操作": "删除节点", "节点ID": "节点_id"} (请使用 [] 中显示的ID)
3. 添加连线：{"操作": "添加连线", "源节点ID": "源节点_id", "目标节点ID": "目标节点_id", "源句柄": "output", "目标句柄": "input"}
4. 删除连线：{"操作": "删除连线", "连线ID": "连线_id"}
5. 修改节点数据：{"操作": "修改节点数据", "节点ID": "节点_id", "数据": {"value": "新文本", "label": "新标签", "isOn": true}}
   （支持修改文本显示内容、开关状态等。例如打开开关请设置 "isOn": true）
6. 控制运行：{"操作": "控制运行", "命令": "run"}
   （命令支持：run (开始/继续), pause (暂停), stop (停止)）
7. 打开流程：{"操作": "打开流程", "流程ID": "flow_id"}
   （可以直接切换到其他流程图）

${availableFlows.length > 0 ? `当前可用的流程列表：\n${availableFlows.map(f => `- ${f.name} (ID: ${f.id})`).join('\n')}\n` : ''}
示例：[{"操作": "添加节点", "节点类型": "AI对话", "标签": "新建AI", "x": 200, "y": 200}]`;
  }, [allowAiEdit, availableFlows]);

  const flowAppendixMd = useMemo(() => {
    return [flowStructureMd, editInstructionsMd].filter(Boolean).join('\n');
  }, [flowStructureMd, editInstructionsMd]);

  const applyFlowUpdates = useCallback((actions: FlowUpdateAction[]) => {
    const newPendingChanges: Record<string, PendingFlowChange> = {};
    let changeIdCounter = Date.now();

    for (const action of actions) {
      // Check for auto-execution permissions
      if (allowAiAutoExecution) {
        // Direct control of execution
        if (action.type === 'controlExecution') {
          onControlExecution?.(action.command);
          toast({
            title: 'AI 自动执行',
            description: `AI 已自动执行: ${action.command === 'run' ? '运行' : action.command === 'pause' ? '暂停' : '停止'}`,
          });
          continue;
        }
        // Direct control of flow switching
        if (action.type === 'openFlow') {
          if (action.flowId) {
             onSwitchFlow?.(action.flowId);
             toast({
                title: 'AI 自动跳转',
                description: `正在跳转到流程: ${action.flowId}`,
             });
          }
          continue;
        }
        // Direct control of switches and buttons (triggers)
        if (action.type === 'updateNodeData') {
          const node = nodes.find(n => n.id === action.nodeId);
          if (node && (node.type === 'switch' || node.type === 'trigger')) {
            onNodeDataChange?.(action.nodeId, action.data);
            toast({
              title: 'AI 自动执行',
              description: `AI 已更新节点 "${node.data.label || node.id}"`,
            });
            continue;
          }
        }
      }

      const changeId = `change_${changeIdCounter++}`;
      let isValid = true;
      let description = '';

      switch (action.type) {
        case 'addNode':
          if (!action.nodeId) {
            action.nodeId = uuidv4();
          }
          description = `添加节点 "${action.label || action.nodeType}" 在 (${action.x}, ${action.y})`;
          break;
        case 'deleteNode':
          const node = nodes.find(n => n.id === action.nodeId);
          if (!node) { isValid = false; break; }
          description = `删除节点 "${node.data.label || node.id}"`;
          break;
        case 'addEdge':
          if (!action.edgeId) {
            action.edgeId = generateEdgeId();
          }
          description = `连接 ${action.sourceId} 到 ${action.targetId}`;
          break;
        case 'deleteEdge':
           const edge = edges.find(e => e.id === action.edgeId);
           if (!edge) { isValid = false; break; }
           description = `删除连线`;
           break;
        case 'updateNodeData':
           const nodeToUpdate = nodes.find(n => n.id === action.nodeId);
           if (!nodeToUpdate) { isValid = false; break; }
           description = `更新节点 "${nodeToUpdate.data.label || nodeToUpdate.id}" 数据`;
           break;
        case 'controlExecution':
           const cmdMap = { 'run': '运行', 'pause': '暂停', 'stop': '停止' };
           description = `控制流程: ${cmdMap[action.command] || action.command}`;
           break;
        case 'openFlow':
           description = `打开流程: ${action.flowId}`;
           break;
        default:
          isValid = false;
      }

      if (isValid) {
        newPendingChanges[changeId] = {
          id: changeId,
          action,
          status: 'pending',
          description
        };
      }
    }

    if (Object.keys(newPendingChanges).length > 0) {
      setPendingChanges((prev: Record<string, PendingFlowChange>) => ({ ...prev, ...newPendingChanges }));
      toast({
        title: 'AI 建议',
        description: `收到 ${Object.keys(newPendingChanges).length} 条修改建议，请确认。`,
      });
    }
  }, [nodes, edges, toast, allowAiAutoExecution, onControlExecution, onNodeDataChange]);

  const handleAiResponse = useCallback((content: string) => {
    if (!allowReadFlow) {
      console.warn('AI 无法处理流程操作：未开启"允许 AI 读取流程图"权限');
      return;
    }
    if (!allowAiEdit) {
      console.warn('AI 无法处理流程操作：未开启"允许 AI 修改流程图"权限');
      return;
    }

    // Helper to find all valid JSON blocks in text
    const extractAllJsonBlocks = (text: string, startChar: string, endChar: string): any[] => {
      const results: any[] = [];
      let startIndex = text.indexOf(startChar);
      
      while (startIndex !== -1) {
        let balance = 0;
        let endIndex = -1;
        let inString = false;
        let escape = false;

        for (let i = startIndex; i < text.length; i++) {
          const char = text[i];
          if (escape) { escape = false; continue; }
          if (char === '\\') { escape = true; continue; }
          if (char === '"') { inString = !inString; continue; }
          if (!inString) {
            if (char === startChar) balance++;
            else if (char === endChar) {
              balance--;
              if (balance === 0) { endIndex = i; break; }
            }
          }
        }

        if (endIndex !== -1) {
          const potentialJson = text.substring(startIndex, endIndex + 1);
          try {
            let cleanJson = potentialJson.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
            cleanJson = cleanJson.replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas
            const parsed = JSON.parse(cleanJson);
            results.push(parsed);
          } catch (e) { 
            // Failed to parse, ignore
          }
        }
        startIndex = text.indexOf(startChar, startIndex + 1);
      }
      return results;
    };

    let actions: FlowUpdateAction[] | null = null;

    // Mapping helper to convert Chinese/English JSON to internal FlowUpdateAction
    const mapAction = (item: any): FlowUpdateAction | null => {
       if (!item || typeof item !== 'object') return null;

       let type = item.type || item.操作;
       const typeMap: Record<string, string> = {
           '添加节点': 'addNode',
           '删除节点': 'deleteNode',
           '添加连线': 'addEdge',
           '删除连线': 'deleteEdge',
           '修改节点数据': 'updateNodeData',
           '控制运行': 'controlExecution',
           '打开流程': 'openFlow',
           '切换流程': 'openFlow'
       };
       if (typeMap[type]) type = typeMap[type];
       
       if (!['addNode', 'deleteNode', 'addEdge', 'deleteEdge', 'updateNodeData', 'controlExecution', 'openFlow'].includes(type)) return null;

       const result: any = { type };
       
       if (type === 'addNode') {
           let nodeType = item.nodeType || item.节点类型;
           const nodeTypeMap: Record<string, string> = {
               '开始': 'start', 'start': 'start',
               '结束': 'end', 'end': 'end',
               '用户输入': 'userInput', 'userInput': 'userInput',
               '文本显示': 'textDisplay', 'textDisplay': 'textDisplay',
               'AI对话': 'aiChat', 'aiChat': 'aiChat',
               '条件': 'condition', 'condition': 'condition',
               '并行': 'parallel', 'parallel': 'parallel',
               '聚合': 'aggregate', 'aggregate': 'aggregate',
               '开关': 'switch', 'switch': 'switch',
               '触发器': 'trigger', 'trigger': 'trigger'
           };
           result.nodeType = nodeTypeMap[nodeType] || nodeType;
           result.label = item.label || item.标签;
           result.x = item.x;
           result.y = item.y;
       } else if (type === 'deleteNode') {
           result.nodeId = item.nodeId || item.节点ID;
       } else if (type === 'addEdge') {
           result.sourceId = item.sourceId || item.源节点ID;
           result.targetId = item.targetId || item.目标节点ID;
           result.sourceHandle = item.sourceHandle || item.源句柄;
           result.targetHandle = item.targetHandle || item.目标句柄;
       } else if (type === 'deleteEdge') {
           result.edgeId = item.edgeId || item.连线ID;
       } else if (type === 'updateNodeData') {
           result.nodeId = item.nodeId || item.节点ID;
           result.data = item.data || item.数据;
       } else if (type === 'controlExecution') {
           const command = item.command || item.命令;
           const commandMap: Record<string, string> = {
               '开始': 'run', 'run': 'run',
               '运行': 'run',
               '暂停': 'pause', 'pause': 'pause',
               '停止': 'stop', 'stop': 'stop'
           };
           result.command = commandMap[command] || command;
       } else if (type === 'openFlow') {
           result.flowId = item.flowId || item.流程ID;
       }
       
       return result as FlowUpdateAction;
    };
    
    // 1. Try to find an array of actions
    const potentialArrays = extractAllJsonBlocks(content, '[', ']');
    for (const parsed of potentialArrays) {
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mappedList = parsed.map(mapAction);
        if (mappedList.every(a => a !== null)) {
            actions = mappedList as FlowUpdateAction[];
            break;
        }
      }
    }

    // 2. If no array found, try to find a single action object
    if (!actions) {
       const potentialObjects = extractAllJsonBlocks(content, '{', '}');
       for (const parsed of potentialObjects) {
          const mapped = mapAction(parsed);
          if (mapped) {
             actions = [mapped];
             break;
          }
       }
    }

    if (actions) {
       const { aiToReal } = idMapping;
       const mappedActions = actions.map(action => {
          const newAction = { ...action };
          
          if (newAction.type === 'deleteNode' && newAction.nodeId) {
             newAction.nodeId = aiToReal.get(newAction.nodeId) || newAction.nodeId;
          }
          
          if (newAction.type === 'addEdge') {
             if (newAction.sourceId) newAction.sourceId = aiToReal.get(newAction.sourceId) || newAction.sourceId;
             if (newAction.targetId) newAction.targetId = aiToReal.get(newAction.targetId) || newAction.targetId;
          }
          
          if (newAction.type === 'deleteEdge' && newAction.edgeId) {
             newAction.edgeId = aiToReal.get(newAction.edgeId) || newAction.edgeId;
          }

          if (newAction.type === 'updateNodeData' && newAction.nodeId) {
             newAction.nodeId = aiToReal.get(newAction.nodeId) || newAction.nodeId;
          }
          
          return newAction;
       });

       applyFlowUpdates(mappedActions);
    }
  }, [allowAiEdit, allowReadFlow, applyFlowUpdates, idMapping]);

  const handleKeepChange = useCallback((changeId: string) => {
    const change = pendingChanges[changeId];
    if (!change) return;

    const { action } = change;
    
    // Execute action
    switch (action.type) {
      case 'addNode':
        let newNode: FlowNode;
        const pos = { x: action.x || 0, y: action.y || 0 };
        const label = action.label || action.nodeType;
        
        switch (action.nodeType) {
            case 'condition': newNode = createConditionNode(pos); break;
            case 'aiChat': newNode = createAIChatNode(pos); break;
            case 'parallel': newNode = createParallelNode(pos); break;
            case 'aggregate': newNode = createAggregateNode(pos); break;
            case 'start': newNode = createBasicNode('start', pos, 'Start', '🟢'); break;
            case 'end': newNode = createBasicNode('end', pos, 'End', '🔴'); break;
            case 'userInput': newNode = createBasicNode('userInput', pos, 'Input', '👤'); break;
            case 'textDisplay': newNode = createBasicNode('textDisplay', pos, 'Display', '📄'); break;
            default: newNode = createBasicNode(action.nodeType, pos, label, '🧩');
        }
        
        if (action.label) newNode.data.label = action.label;
        if (action.nodeId) newNode.id = action.nodeId;
        setNodes((prev: FlowNode[]) => [...prev, newNode]);
        break;

      case 'deleteNode':
        setNodes((prev: FlowNode[]) => prev.filter((n: FlowNode) => n.id !== action.nodeId));
        setEdges((prev: FlowEdge[]) => prev.filter((e: FlowEdge) => e.source !== action.nodeId && e.target !== action.nodeId));
        break;

      case 'addEdge':
        const newEdge: FlowEdge = {
          id: action.edgeId || generateEdgeId(),
          type: 'default',
          source: action.sourceId,
          target: action.targetId,
          sourceHandle: action.sourceHandle || 'output',
          targetHandle: action.targetHandle || 'input',
          style: { stroke: '#64748b', strokeWidth: 2 }
        };
        setEdges((prev: FlowEdge[]) => [...prev, newEdge]);
        break;

      case 'deleteEdge':
        setEdges((prev: FlowEdge[]) => prev.filter((e: FlowEdge) => e.id !== action.edgeId));
        break;

      case 'updateNodeData':
        if (onNodeDataChange) {
            onNodeDataChange(action.nodeId, action.data);
        } else {
            setNodes((prev: FlowNode[]) => prev.map(n => n.id === action.nodeId ? { ...n, data: { ...n.data, ...action.data } } : n));
        }
        break;

      case 'controlExecution':
        if (onControlExecution) {
            onControlExecution(action.command);
        }
        break;

      case 'openFlow':
        if (action.flowId) {
            onSwitchFlow?.(action.flowId);
        }
        break;
    }

    setPendingChanges((prev: Record<string, PendingFlowChange>) => {
      const next = { ...prev };
      delete next[changeId];
      return next;
    });

    toast({ title: 'Change applied' });
  }, [pendingChanges, setNodes, setEdges, toast]);

  const handleRevertChange = useCallback((changeId: string) => {
    setPendingChanges((prev: Record<string, PendingFlowChange>) => {
      const next = { ...prev };
      delete next[changeId];
      return next;
    });
  }, []);

  const handleKeepAll = useCallback(() => {
    Object.keys(pendingChanges).forEach(id => handleKeepChange(id));
  }, [pendingChanges, handleKeepChange]);

  const handleRevertAll = useCallback(() => {
    setPendingChanges({});
  }, []);

  const previewElements = useMemo(() => {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    
    Object.values(pendingChanges).forEach(change => {
      const { action } = change;
      if (action.type === 'addNode' && action.nodeId) {
        const pos = { x: action.x || 0, y: action.y || 0 };
        const label = action.label || action.nodeType;
        let newNode: FlowNode;
        
        switch (action.nodeType) {
            case 'condition': newNode = createConditionNode(pos); break;
            case 'aiChat': newNode = createAIChatNode(pos); break;
            case 'parallel': newNode = createParallelNode(pos); break;
            case 'aggregate': newNode = createAggregateNode(pos); break;
            case 'start': newNode = createBasicNode('start', pos, 'Start', '🟢'); break;
            case 'end': newNode = createBasicNode('end', pos, 'End', '🔴'); break;
            case 'userInput': newNode = createBasicNode('userInput', pos, 'Input', '👤'); break;
            case 'textDisplay': newNode = createBasicNode('textDisplay', pos, 'Display', '📄'); break;
            default: newNode = createBasicNode(action.nodeType, pos, label, '🧩');
        }
        
        newNode.id = action.nodeId;
        if (action.label) newNode.data.label = action.label;
        
        nodes.push(newNode);
      }
      
      if (action.type === 'addEdge' && action.edgeId) {
        edges.push({
          id: action.edgeId,
          source: action.sourceId,
          target: action.targetId,
          sourceHandle: action.sourceHandle || 'output',
          targetHandle: action.targetHandle || 'input',
          type: 'default',
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2, strokeDasharray: '5,5' }
        });
      }
    });
    
    return { nodes, edges };
  }, [pendingChanges]);

  return {
    pendingChanges,
    pendingChangeState,
    previewElements,
    floatingChatOpen, setFloatingChatOpen,
    floatingChatModel, setFloatingChatModel,
    floatingChatPosition, setFloatingChatPosition,
    flowAppendixMd,
    handleAiResponse,
    handleKeepChange,
    handleRevertChange,
    handleKeepAll,
    handleRevertAll,
    flowStructureMd,
    editInstructionsMd
  };
};
