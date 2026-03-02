
import { MindmapNode } from '../types';

/**
 * 将思维导图节点转换为 Markdown 格式的文本表示
 * @param nodes 节点列表
 * @param options 配置选项
 * @returns Markdown 文本
 */
export function mindmapToMarkdown(
  nodes: MindmapNode[],
  options?: {
    rootId?: string;
    maxDepth?: number;
  }
): string {
  if (!nodes || nodes.length === 0) {
    return '';
  }

  // 找到起始节点
  let root: MindmapNode | undefined;
  if (options?.rootId) {
    root = nodes.find(n => n.id === options.rootId);
  } else {
    root = nodes.find(n => n.isRoot);
  }

  if (!root) {
    return '';
  }

  const lines: string[] = [];
  const maxDepth = options?.maxDepth ?? Infinity;
  
  // 递归构建树形结构
  const buildTree = (node: MindmapNode, depth: number, isLast: boolean, prefix: string) => {
    // 超过最大深度则停止
    if (depth > maxDepth) return;

    // 根节点不需要连接符
    const connector = depth === 0 ? '' : (isLast ? '└─ ' : '├─ ');
    const currentPrefix = depth === 0 ? '' : prefix;
    
    // 节点格式：前缀 + 连接符 + 节点名
    lines.push(`${currentPrefix}${connector}${node.name}`);

    // 如果已达到最大深度，不再递归处理子节点
    if (depth >= maxDepth) return;

    // 计算下一级的前缀
    const nextPrefix = currentPrefix + (isLast ? '   ' : '│  ');

    if (node.children && node.children.length > 0) {
      // 获取子节点
      const children = node.children
        .map(childId => nodes.find(n => n.id === childId))
        .filter((child): child is MindmapNode => child !== undefined);

      children.forEach((child, index) => {
        const childIsLast = index === children.length - 1;
        buildTree(child, depth + 1, childIsLast, nextPrefix);
      });
    }
  };

  // 从起始节点开始构建
  buildTree(root, 0, true, '');

  return lines.join('\n');
}
