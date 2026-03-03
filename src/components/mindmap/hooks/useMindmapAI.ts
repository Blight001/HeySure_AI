/**
 * HeySure AI - 思维导图 AI Hook
 * 处理思维导图中的 AI 相关功能：
 * - AI 修改建议生成
 * - 待确认变更管理
 * - 节点添加/删除/修改操作
 * - AI 执行结果处理
 * - 思维导图自动优化建议
 */
import { useState, useCallback, useMemo } from 'react';
import { MindmapUpdateAction, PendingChange, MindmapNode } from '../types';
import { mindmapStorage } from '../services/mindmap-storage';
import { useToast } from '@/hooks/use-toast';
import { extractMindmapUpdateActionsFromText } from '@/utils/aiEditProtocol';

interface UseMindmapAIProps {
  nodes: MindmapNode[];
  setNodes: (nodes: MindmapNode[]) => void;
  setNodeIndex: (index: Record<string, MindmapNode>) => void;
  refreshMap: () => void;
  mapName: string;
  allowReadMindmap: boolean;
  allowAiEdit: boolean;
}

export const useMindmapAI = ({
  nodes,
  setNodes,
  setNodeIndex,
  refreshMap,
  mapName,
  allowReadMindmap,
  allowAiEdit
}: UseMindmapAIProps) => {
  const { toast } = useToast();
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [floatingChatModel, setFloatingChatModel] = useState<any>(null);
  const [floatingChatPosition, setFloatingChatPosition] = useState({ x: 0, y: 0 });

  // 生成思维导图的Markdown表示（文件夹树形结构）- 使用序号代替真实ID
  const buildMindmapMarkdown = useCallback((currentNodes: MindmapNode[]): {
    markdown: string;
    idMap: Map<number, string>;
  } => {
    if (!currentNodes || currentNodes.length === 0) {
      return { markdown: '', idMap: new Map() };
    }

    // 找到根节点
    const root = currentNodes.find(n => n.isRoot);
    if (!root) {
      return { markdown: '', idMap: new Map() };
    }

    const lines: string[] = [];
    const idMap = new Map<number, string>();
    let counter = 1;

    // 递归构建树形结构
    const buildTree = (node: MindmapNode, depth: number, isLast: boolean, prefix: string) => {
      // 根据层级和位置构建前缀符号
      const connector = isLast ? '└─ ' : '├─ ';

      // 记录序号到真实ID的映射
      const seqId = counter++;
      idMap.set(seqId, node.id);

      // 节点格式：层级缩进 + 连接符 + 节点名 [ID: 序号]
      const indent = '  '.repeat(depth);
      lines.push(`${prefix}${indent}${connector}${node.name} [ID: ${seqId}]`);

      if (node.children && node.children.length > 0) {
        // 获取子节点
        const children = node.children
          .map(childId => currentNodes.find(n => n.id === childId))
          .filter((child): child is MindmapNode => child !== undefined);

        children.forEach((child, index) => {
          const childIsLast = index === children.length - 1;
          buildTree(child, depth + 1, childIsLast, prefix);
        });
      }
    };

    // 从根节点开始构建
    buildTree(root, 0, true, '');

    return { markdown: lines.join('\n'), idMap };
  }, [mapName]);

  const mindmapAppendixMd = useMemo(() => {
    if (!allowReadMindmap) return { content: '', idMap: new Map() };

    const { markdown } = buildMindmapMarkdown(nodes);

    let content = `思维导图结构:
${markdown}
请简洁回答用户请求`;

    // 如果允许编辑，显示修改格式说明
    if (allowAiEdit) {
      content += `
如需修改思维导图在尾部加上对应格式的修改请求。
修改请求格式说明:
统一操作格式（推荐，和流程图一致）:
1. 修改节点名称: {"target":"mindmap","op":"rename","nodeId":"序号","name":"新名称"}
2. 添加子节点: {"target":"mindmap","op":"add","parentId":"父序号","name":"节点名称"}
3. 删除节点: {"target":"mindmap","op":"delete","nodeId":"序号"}
4. 移动节点: {"target":"mindmap","op":"move","nodeId":"序号","newParentId":"新父序号","index":0} (index可选)
兼容说明：也兼容旧格式 {"type":"rename/add/delete/move"}。
例如:[{"target":"mindmap","op":"add","parentId":"1","name":""}]`;
    }

    return { content, idMap: buildMindmapMarkdown(nodes).idMap };
  }, [allowReadMindmap, allowAiEdit, nodes, buildMindmapMarkdown]);

  const applyMindmapUpdates = useCallback(async (actions: MindmapUpdateAction[], idMap: Map<number, string>) => {
    const newPendingChanges: Record<string, PendingChange> = {};
    let changeIdCounter = Date.now();

    // 将序号转换为真实ID的辅助函数
    const seqToRealId = (seqId: string | number | undefined): string | undefined => {
      if (!seqId) return undefined;
      const num = typeof seqId === 'string' ? parseInt(seqId, 10) : seqId;
      return idMap.get(num);
    };

    for (const action of actions) {
      const changeId = `change_${changeIdCounter++}`;

      // 验证操作有效性
      let isValid = true;
      let description = '';

      try {
        const currentMap = mindmapStorage.getCurrentMap();
        if (!currentMap) throw new Error('No active map');

        const nodeIndex = mindmapStorage.getNodeIndex();

        // 转换序号到真实ID
        const realNodeId = seqToRealId(action.nodeId);
        const realParentId = action.parentId ? seqToRealId(action.parentId) : undefined;
        const realNewParentId = action.newParentId ? seqToRealId(action.newParentId) : undefined;

        switch (action.type) {
          case 'rename':
            if (!realNodeId || !action.name) { isValid = false; break; }
            if (!nodeIndex[realNodeId]) { isValid = false; break; }
            description = `重命名 "${nodeIndex[realNodeId].name}" 为 "${action.name}"`;
            action.nodeId = realNodeId;
            break;
          case 'add':
            if (!realParentId || typeof action.name !== 'string') { isValid = false; break; }
            if (!nodeIndex[realParentId]) { isValid = false; break; }
            // 先创建节点，获取新节点ID，这样新节点会显示蓝色待确认框
            const newNode = await mindmapStorage.addNode(realParentId, action.name);
            description = `添加 "${action.name}"`;
            action.nodeId = newNode.id;
            (action as MindmapUpdateAction).parentId = realParentId;
            break;
          case 'delete':
            if (!realNodeId) { isValid = false; break; }
            if (!nodeIndex[realNodeId]) { isValid = false; break; }
            description = `删除节点 "${nodeIndex[realNodeId].name}"`;
            action.nodeId = realNodeId;
            break;
          case 'move':
            if (!realNodeId || !realNewParentId) { isValid = false; break; }
            if (!nodeIndex[realNodeId] || !nodeIndex[realNewParentId]) { isValid = false; break; }
            description = `移动 "${nodeIndex[realNodeId].name}" 到 "${nodeIndex[realNewParentId].name}"`;
            action.nodeId = realNodeId;
            (action as MindmapUpdateAction).newParentId = realNewParentId;
            break;
          default:
            isValid = false;
        }
      } catch (e) {
        isValid = false;
      }

      if (isValid) {
        newPendingChanges[changeId] = {
          id: changeId,
          action: { ...action },
          status: 'pending',
          description
        };
      }
    }

    if (Object.keys(newPendingChanges).length > 0) {
      setPendingChanges(prev => ({ ...prev, ...newPendingChanges }));
      toast({
        title: 'AI 建议修改',
        description: `收到 ${Object.keys(newPendingChanges).length} 个修改建议，请在图中确认`,
      });
      // 刷新思维导图显示
      refreshMap();
    }
  }, [toast, refreshMap]);

  const handleAiResponse = useCallback((content: string) => {
    if (!allowAiEdit || !allowReadMindmap) return;

    const actions = extractMindmapUpdateActionsFromText(content);
    if (actions.length > 0) {
      const { idMap } = buildMindmapMarkdown(nodes);
      void applyMindmapUpdates(actions, idMap);
      return;
    }

    if (content.includes('"type"') || content.includes('"op"') || content.includes('"target"')) {
      console.warn('Failed to extract valid JSON actions from content:', content);
      toast({
        title: 'AI 响应解析警告',
        description: '检测到可能的操作指令，但无法解析为有效的 JSON 格式',
        variant: 'destructive'
      });
    }
  }, [allowAiEdit, allowReadMindmap, nodes, buildMindmapMarkdown, applyMindmapUpdates, toast]);

  const handleKeepChange = useCallback(async (changeId: string) => {
    const change = pendingChanges[changeId];
    if (!change) return;

    try {
      const { action } = change;
      switch (action.type) {
        case 'rename':
          if (action.nodeId && action.name) {
            await mindmapStorage.updateNode(action.nodeId, { name: action.name });
          }
          break;
        case 'add':
          // 节点在 applyMindmapUpdates 时已创建，确认时只需移除 pending 状态
          break;
        case 'delete':
          if (action.nodeId) {
            await mindmapStorage.deleteNode(action.nodeId);
          }
          break;
        case 'move':
          if (action.nodeId && action.newParentId) {
            await mindmapStorage.reparentNode(action.nodeId, action.newParentId, action.index);
          }
          break;
      }
      
      refreshMap();
      
      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[changeId];
        return next;
      });

      toast({ title: '已应用修改' });
    } catch (error) {
      console.error('Failed to apply change:', error);
      toast({ title: '应用修改失败', variant: 'destructive' });
    }
  }, [pendingChanges, refreshMap, toast]);

  const handleRevertChange = useCallback((changeId: string) => {
    const change = pendingChanges[changeId];
    if (!change) return;

    // 如果是 add 操作，撤回时需要删除刚添加的节点
    if (change.action.type === 'add' && change.action.nodeId) {
      mindmapStorage.deleteNode(change.action.nodeId);
      refreshMap();
    }

    setPendingChanges(prev => {
      const next = { ...prev };
      delete next[changeId];
      return next;
    });
  }, [refreshMap]);

  const handleKeepAll = useCallback(async () => {
    for (const changeId of Object.keys(pendingChanges)) {
      await handleKeepChange(changeId);
    }
  }, [pendingChanges, handleKeepChange]);

  const handleRevertAll = useCallback(() => {
    setPendingChanges({});
  }, []);

  return {
    pendingChanges, setPendingChanges,
    floatingChatOpen, setFloatingChatOpen,
    floatingChatModel, setFloatingChatModel,
    floatingChatPosition, setFloatingChatPosition,
    mindmapAppendixMd: mindmapAppendixMd.content,
    handleAiResponse,
    handleKeepChange,
    handleRevertChange,
    handleKeepAll,
    handleRevertAll
  };
};
