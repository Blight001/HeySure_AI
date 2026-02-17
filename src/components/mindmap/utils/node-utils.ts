import { MindmapNode, MindmapData } from '../types';

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 克隆节点快照
 */
export function cloneNodeSnapshot(node: MindmapNode): MindmapNode {
  return JSON.parse(JSON.stringify(node)) as MindmapNode;
}

/**
 * 克隆思维导图快照
 */
export function cloneMapSnapshot(map: MindmapData): MindmapData {
  return JSON.parse(JSON.stringify(map)) as MindmapData;
}

/**
 * 获取所有子节点ID
 */
export function getAllDescendants(nodeId: string, nodeIndex: Record<string, MindmapNode>): string[] {
  const descendants: string[] = [];
  const node = nodeIndex[nodeId];
  if (!node) return descendants;

  for (const childId of node.children) {
    descendants.push(childId);
    descendants.push(...getAllDescendants(childId, nodeIndex));
  }

  return descendants;
}

/**
 * 获取所有子节点（带数据）
 */
export function getAllDescendantsWithData(nodeId: string, nodeIndex: Record<string, MindmapNode>): MindmapNode[] {
  const descendants: MindmapNode[] = [];
  const node = nodeIndex[nodeId];
  if (!node) return descendants;

  for (const childId of node.children) {
    const child = nodeIndex[childId];
    if (child) {
      descendants.push({ ...child });
      descendants.push(...getAllDescendantsWithData(childId, nodeIndex));
    }
  }

  return descendants;
}

/**
 * 克隆节点
 */
export function cloneNode(node: MindmapNode, newParentId: string | null): MindmapNode {
  return {
    ...node,
    id: generateId(),
    parentId: newParentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    children: []
  };
}

/**
 * 生成ID映射
 */
export function generateIdMapping(nodes: MindmapNode[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const node of nodes) {
    mapping[node.id] = generateId();
  }
  return mapping;
}

/**
 * 应用ID映射
 */
export function applyIdMapping(node: MindmapNode, mapping: Record<string, string>): MindmapNode {
  const newNode = { ...node };
  newNode.id = mapping[node.id];
  if (node.parentId && mapping[node.parentId]) {
    newNode.parentId = mapping[node.parentId];
  }
  newNode.children = node.children
    .map(childId => mapping[childId])
    .filter(Boolean);
  return newNode;
}

/**
 * 重建节点索引
 */
export function rebuildNodeIndex(nodes: MindmapNode[]): Record<string, MindmapNode> {
  const index: Record<string, MindmapNode> = {};
  for (const node of nodes) {
    index[node.id] = node;
  }
  return index;
}
