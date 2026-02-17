/**
 * 思维导图布局引擎
 * 支持多种布局方式，默认使用右侧树状布局
 */

import { MindmapNode, LayoutType as LayoutTypeEnum, LayoutConfig } from '../types';

// 导出 LayoutType 以便在其他文件中使用
export type LayoutType = LayoutTypeEnum;

// 默认布局配置
export const defaultLayoutConfig: LayoutConfig = {
  type: 'tree-right',
  nodeWidth: 140,
  nodeHeight: 40,
  horizontalSpacing: 200,
  verticalSpacing: 60,
  rootX: 0,
  rootY: 0
};

// 节点位置信息
export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

// 布局结果
export interface LayoutResult {
  positions: Map<string, NodePosition>;
  config: LayoutConfig;
}

// 布局引擎接口
export interface LayoutEngine {
  layout(nodes: MindmapNode[], config: LayoutConfig): LayoutResult;
  getType(): LayoutType;
}

// 布局引擎基类
abstract class BaseLayoutEngine implements LayoutEngine {
  protected nodeIndex: Map<string, MindmapNode>;
  // 缓存子树尺寸，避免重复计算 (Optimization: O(N) instead of O(N^2))
  protected subtreeSizes: Map<string, number>;

  constructor() {
    this.nodeIndex = new Map();
    this.subtreeSizes = new Map();
  }

  abstract layout(nodes: MindmapNode[], config: LayoutConfig): LayoutResult;
  abstract getType(): LayoutType;

  protected buildNodeIndex(nodes: MindmapNode[]): void {
    this.nodeIndex.clear();
    this.subtreeSizes.clear();
    for (const node of nodes) {
      this.nodeIndex.set(node.id, node);
    }
  }

  protected getNode(id: string): MindmapNode | undefined {
    return this.nodeIndex.get(id);
  }

  protected getNodeHeight(nodeId: string, config: LayoutConfig): number {
    return config.nodeHeights?.[nodeId] || config.nodeHeight;
  }

  protected getChildren(nodeId: string): MindmapNode[] {
    const node = this.getNode(nodeId);
    if (!node) return [];
    
    // 如果节点被折叠，则视为没有子节点需要布局
    if (node.collapsed) return [];

    return node.children
      .map(childId => this.getNode(childId))
      .filter((n): n is MindmapNode => n !== undefined);
  }

  // 计算子树总高度 (用于左右布局)
  protected calculateSubtreeTotalHeight(nodeId: string, config: LayoutConfig): number {
    // Check cache first
    if (this.subtreeSizes.has(nodeId)) {
      return this.subtreeSizes.get(nodeId)!;
    }

    const node = this.getNode(nodeId);
    const nodeHeight = this.getNodeHeight(nodeId, config);

    if (!node) {
      return 0;
    }

    const children = this.getChildren(nodeId);
    if (children.length === 0) {
      this.subtreeSizes.set(nodeId, nodeHeight);
      return nodeHeight;
    }

    // 子树高度 = 所有子节点子树高度之和 + 子节点之间的间距
    let childrenHeight = children.reduce(
      (sum, child) => sum + this.calculateSubtreeTotalHeight(child.id, config),
      0
    );
    childrenHeight += (children.length - 1) * config.verticalSpacing;

    // 优化：取节点本身高度和子节点总高度的较大值，防止节点重叠
    const totalHeight = Math.max(nodeHeight, childrenHeight);
    
    this.subtreeSizes.set(nodeId, totalHeight);
    return totalHeight;
  }

  // 计算子树总宽度 (用于上下布局)
  protected calculateSubtreeTotalWidth(nodeId: string, config: LayoutConfig): number {
    // Check cache first
    if (this.subtreeSizes.has(nodeId)) {
      return this.subtreeSizes.get(nodeId)!;
    }

    const node = this.getNode(nodeId);
    // 上下布局时，节点宽度通常是固定的，但为了通用性，这里也可以支持变宽
    const nodeWidth = config.nodeWidth; 

    if (!node) {
      return 0;
    }

    const children = this.getChildren(nodeId);
    if (children.length === 0) {
      this.subtreeSizes.set(nodeId, nodeWidth);
      return nodeWidth;
    }

    // 子树宽度 = 所有子节点子树宽度之和 + 子节点之间的间距
    let childrenWidth = children.reduce(
      (sum, child) => sum + this.calculateSubtreeTotalWidth(child.id, config),
      0
    );
    childrenWidth += (children.length - 1) * config.horizontalSpacing;

    // 优化：取节点本身宽度和子节点总宽度的较大值
    const totalWidth = Math.max(nodeWidth, childrenWidth);

    this.subtreeSizes.set(nodeId, totalWidth);
    return totalWidth;
  }
}

// 右侧树状布局（默认）
class TreeRightLayout extends BaseLayoutEngine {
  getType(): LayoutType {
    return 'tree-right';
  }

  layout(nodes: MindmapNode[], config: LayoutConfig): LayoutResult {
    this.buildNodeIndex(nodes);
    const positions = new Map<string, NodePosition>();
    const { rootX = 0, rootY = 0 } = config;

    const rootNode = nodes.find(n => n.isRoot);
    if (!rootNode) {
      return { positions, config };
    }

    // 预计算所有子树高度 (Pass 1)
    this.calculateSubtreeTotalHeight(rootNode.id, config);

    // 设置根节点位置
    positions.set(rootNode.id, { id: rootNode.id, x: rootX, y: rootY });

    // 递归布局子树 (Pass 2)
    this.layoutSubtree(rootNode.id, config, positions);

    return { positions, config };
  }

  private layoutSubtree(nodeId: string, config: LayoutConfig, positions: Map<string, NodePosition>): void {
    const node = this.getNode(nodeId);
    if (!node) return;

    const children = this.getChildren(nodeId);
    if (children.length === 0) return;

    const currentPos = positions.get(nodeId);
    if (!currentPos) return;

    // 使用缓存的高度
    const childHeights = children.map(child => this.calculateSubtreeTotalHeight(child.id, config));
    const totalChildrenHeight = childHeights.reduce((sum, h) => sum + h, 0) + (children.length - 1) * config.verticalSpacing;

    // 计算起始Y：从父节点中心开始，向上偏移一半的总高度
    let currentY = currentPos.y - totalChildrenHeight / 2;

    // 重新定位每个子节点
    children.forEach((child, index) => {
      const childHeight = childHeights[index];

      // 子节点的Y = 当前Y + 子树高度的一半 - 节点高度的一半（校正中心点）
      // 注意：这里的 currentY 是子树块的顶部，我们需要找到子树块的中心，然后减去节点高度的一半
      // 实际上：childY center = currentY (top of this child block) + childHeight / 2
      // 但我们需要的是 top-left 还是 center? NodePosition 通常是 top-left 还是 center? 
      // 根据原代码: currentPos.y - totalHeight / 2 暗示是中心对齐。
      // 原代码: const childY = currentY + childHeight / 2 - this.getNodeHeight(child.id, config) / 2;
      // 假设 NodePosition.y 是节点的中心点? 
      // 不，通常 Mindmap 渲染是 Top-Left。
      // 如果 defaultLayoutConfig.rootX/Y 是 0, 0。
      // 让我们假设 x,y 是节点的 *中心* 坐标，或者原代码试图做中心对齐。
      // "currentY" 在原代码中是累加器。
      // 原代码逻辑：currentY 从 (Center - Total/2) 开始。
      // childY = currentY + childHeight/2 - nodeHeight/2. 
      // 如果 x,y 是 Top-Left，那么 CenterY = Y + H/2. 
      // 这里的逻辑有点混杂。
      // 让我们保持原代码的几何逻辑，因为它可能是配合渲染层的。
      // 如果渲染层认为是 Center，那么 `childY` 计算应该是 `currentY + childHeight / 2`.
      // 如果渲染层认为是 Top-Left，那么我们需要减去 `nodeHeight/2`.
      // 原代码减去了 `nodeHeight/2`，这强烈暗示 positions 存储的是 Top-Left 坐标，但是布局计算是基于中心的。
      
      // 修正逻辑：
      // blockTop = currentY
      // blockCenter = currentY + childHeight / 2
      // nodeTop = blockCenter - nodeHeight / 2
      const nodeH = this.getNodeHeight(child.id, config);
      const childY = currentY + childHeight / 2 - nodeH / 2;
      
      const childX = currentPos.x + config.horizontalSpacing;

      positions.set(child.id, { id: child.id, x: childX, y: childY });

      // 递归调整子节点的子树
      this.layoutSubtree(child.id, config, positions);

      // 移动到下一个子节点的起始位置（加上间距）
      currentY += childHeight + config.verticalSpacing;
    });
  }
}

// 左侧树状布局
class TreeLeftLayout extends BaseLayoutEngine {
  getType(): LayoutType {
    return 'tree-left';
  }

  layout(nodes: MindmapNode[], config: LayoutConfig): LayoutResult {
    this.buildNodeIndex(nodes);
    const positions = new Map<string, NodePosition>();
    const { rootX = 0, rootY = 0 } = config;

    const rootNode = nodes.find(n => n.isRoot);
    if (!rootNode) {
      return { positions, config };
    }

    this.calculateSubtreeTotalHeight(rootNode.id, config);
    positions.set(rootNode.id, { id: rootNode.id, x: rootX, y: rootY });
    this.layoutSubtree(rootNode.id, config, positions);

    return { positions, config };
  }

  private layoutSubtree(nodeId: string, config: LayoutConfig, positions: Map<string, NodePosition>): void {
    const node = this.getNode(nodeId);
    if (!node) return;

    const children = this.getChildren(nodeId);
    if (children.length === 0) return;

    const currentPos = positions.get(nodeId);
    if (!currentPos) return;

    const childHeights = children.map(child => this.calculateSubtreeTotalHeight(child.id, config));
    const totalChildrenHeight = childHeights.reduce((sum, h) => sum + h, 0) + (children.length - 1) * config.verticalSpacing;

    let currentY = currentPos.y - totalChildrenHeight / 2;

    children.forEach((child, index) => {
      const childHeight = childHeights[index];
      const nodeH = this.getNodeHeight(child.id, config);
      const childY = currentY + childHeight / 2 - nodeH / 2;
      
      // 向左布局
      const childX = currentPos.x - config.horizontalSpacing;

      positions.set(child.id, { id: child.id, x: childX, y: childY });
      this.layoutSubtree(child.id, config, positions);
      currentY += childHeight + config.verticalSpacing;
    });
  }
}

// 顶部树状布局
class TreeTopLayout extends BaseLayoutEngine {
  getType(): LayoutType {
    return 'tree-top';
  }

  layout(nodes: MindmapNode[], config: LayoutConfig): LayoutResult {
    this.buildNodeIndex(nodes);
    const positions = new Map<string, NodePosition>();
    const { rootX = 0, rootY = 0 } = config;

    const rootNode = nodes.find(n => n.isRoot);
    if (!rootNode) {
      return { positions, config };
    }

    // 预计算宽度
    this.calculateSubtreeTotalWidth(rootNode.id, config);
    positions.set(rootNode.id, { id: rootNode.id, x: rootX, y: rootY });
    this.layoutSubtree(rootNode.id, config, positions);

    return { positions, config };
  }

  private layoutSubtree(nodeId: string, config: LayoutConfig, positions: Map<string, NodePosition>): void {
    const node = this.getNode(nodeId);
    if (!node) return;

    const children = this.getChildren(nodeId);
    if (children.length === 0) return;

    const currentPos = positions.get(nodeId);
    if (!currentPos) return;

    // 计算每个子节点子树的总宽度
    const childWidths = children.map(child => this.calculateSubtreeTotalWidth(child.id, config));
    const totalWidth = childWidths.reduce((sum, w) => sum + w, 0) + (children.length - 1) * config.horizontalSpacing;

    let currentX = currentPos.x - totalWidth / 2;

    children.forEach((child, index) => {
      const childWidth = childWidths[index];
      
      // 子节点 X = currentX + childWidth / 2 - nodeWidth / 2
      const childX = currentX + childWidth / 2 - config.nodeWidth / 2;
      
      // 向上布局
      const childY = currentPos.y - config.verticalSpacing; // 原代码用 horizontalSpacing，这可能是个笔误或特定设计，通常垂直布局用 verticalSpacing 做层距

      positions.set(child.id, { id: child.id, x: childX, y: childY });
      this.layoutSubtree(child.id, config, positions);
      currentX += childWidth + config.horizontalSpacing;
    });
  }
}

// 底部树状布局
class TreeBottomLayout extends BaseLayoutEngine {
  getType(): LayoutType {
    return 'tree-bottom';
  }

  layout(nodes: MindmapNode[], config: LayoutConfig): LayoutResult {
    this.buildNodeIndex(nodes);
    const positions = new Map<string, NodePosition>();
    const { rootX = 0, rootY = 0 } = config;

    const rootNode = nodes.find(n => n.isRoot);
    if (!rootNode) {
      return { positions, config };
    }

    this.calculateSubtreeTotalWidth(rootNode.id, config);
    positions.set(rootNode.id, { id: rootNode.id, x: rootX, y: rootY });
    this.layoutSubtree(rootNode.id, config, positions);

    return { positions, config };
  }

  private layoutSubtree(nodeId: string, config: LayoutConfig, positions: Map<string, NodePosition>): void {
    const node = this.getNode(nodeId);
    if (!node) return;

    const children = this.getChildren(nodeId);
    if (children.length === 0) return;

    const currentPos = positions.get(nodeId);
    if (!currentPos) return;

    const childWidths = children.map(child => this.calculateSubtreeTotalWidth(child.id, config));
    const totalWidth = childWidths.reduce((sum, w) => sum + w, 0) + (children.length - 1) * config.horizontalSpacing;

    let currentX = currentPos.x - totalWidth / 2;

    children.forEach((child, index) => {
      const childWidth = childWidths[index];
      const childX = currentX + childWidth / 2 - config.nodeWidth / 2;
      
      // 向下布局
      const childY = currentPos.y + config.verticalSpacing; // 修正为 verticalSpacing

      positions.set(child.id, { id: child.id, x: childX, y: childY });
      this.layoutSubtree(child.id, config, positions);
      currentX += childWidth + config.horizontalSpacing;
    });
  }
}

// 径向布局（简单优化，实际完全的径向布局比较复杂，维持原逻辑但加上空值检查）
class RadialLayout extends BaseLayoutEngine {
  getType(): LayoutType {
    return 'radial';
  }

  layout(nodes: MindmapNode[], config: LayoutConfig): LayoutResult {
    this.buildNodeIndex(nodes);
    const positions = new Map<string, NodePosition>();
    const { rootX = 0, rootY = 0 } = config;

    const rootNode = nodes.find(n => n.isRoot);
    if (!rootNode) {
      return { positions, config };
    }

    positions.set(rootNode.id, { id: rootNode.id, x: rootX, y: rootY });
    this.layoutSubtree(rootNode.id, config, positions, 0);

    return { positions, config };
  }

  protected calculateSubtreeSize(nodeId: string, config: LayoutConfig): number {
    return 0; // Not used for radial currently
  }

  private layoutSubtree(
    nodeId: string,
    config: LayoutConfig,
    positions: Map<string, NodePosition>,
    depth: number
  ): void {
    const node = this.getNode(nodeId);
    if (!node) return;

    const children = this.getChildren(nodeId);
    if (children.length === 0) return;

    const currentPos = positions.get(nodeId);
    if (!currentPos) return;

    const radius = config.horizontalSpacing * (depth + 1);
    const angleStep = (2 * Math.PI) / children.length;

    children.forEach((child, index) => {
      const angle = index * angleStep - Math.PI / 2; // 从顶部开始
      const childX = currentPos.x + radius * Math.cos(angle);
      const childY = currentPos.y + radius * Math.sin(angle);

      positions.set(child.id, { id: child.id, x: childX, y: childY });
      this.layoutSubtree(child.id, config, positions, depth + 1);
    });
  }
}

// 鱼骨图布局
class FishboneLayout extends BaseLayoutEngine {
  getType(): LayoutType {
    return 'fishbone';
  }

  layout(nodes: MindmapNode[], config: LayoutConfig): LayoutResult {
    this.buildNodeIndex(nodes);
    const positions = new Map<string, NodePosition>();
    const { rootX = 0, rootY = 0 } = config;

    const rootNode = nodes.find(n => n.isRoot);
    if (!rootNode) {
      return { positions, config };
    }
    
    // 预计算高度，虽然鱼骨图计算方式略有不同，但 calculateSubtreeTotalHeight 提供了一个基础参考
    // 这里我们可能需要自定义的计算，但为了复用和性能，我们先用通用的
    this.calculateSubtreeTotalHeight(rootNode.id, config);

    positions.set(rootNode.id, { id: rootNode.id, x: rootX, y: rootY });
    this.layoutSubtree(rootNode.id, config, positions, 0);

    return { positions, config };
  }

  private layoutSubtree(
    nodeId: string,
    config: LayoutConfig,
    positions: Map<string, NodePosition>,
    depth: number
  ): void {
    const node = this.getNode(nodeId);
    if (!node) return;

    const children = this.getChildren(nodeId);
    if (children.length === 0) return;

    const currentPos = positions.get(nodeId);
    if (!currentPos) return;

    const upperChildren: MindmapNode[] = [];
    const lowerChildren: MindmapNode[] = [];

    // 上下交替
    children.forEach((child, index) => {
      if (index % 2 === 0) {
        lowerChildren.push(child);
      } else {
        upperChildren.push(child);
      }
    });

    // 使用缓存的高度计算
    const getCachedHeight = (id: string) => this.subtreeSizes.get(id) || this.calculateSubtreeTotalHeight(id, config);

    const upperHeight = upperChildren.reduce(
      (sum, child) => sum + getCachedHeight(child.id),
      0
    ) + (Math.max(0, upperChildren.length - 1)) * config.verticalSpacing;

    const lowerHeight = lowerChildren.reduce(
      (sum, child) => sum + getCachedHeight(child.id),
      0
    ) + (Math.max(0, lowerChildren.length - 1)) * config.verticalSpacing;

    const totalHeight = upperHeight + lowerHeight;
    let currentY = currentPos.y - totalHeight / 2;

    // 上方分支
    upperChildren.forEach((child) => {
      const childHeight = getCachedHeight(child.id);
      const nodeH = this.getNodeHeight(child.id, config);
      const childY = currentY + childHeight / 2 - nodeH / 2;
      const childX = currentPos.x + config.horizontalSpacing;

      positions.set(child.id, { id: child.id, x: childX, y: childY });
      this.layoutSubtree(child.id, config, positions, depth + 1);

      currentY += childHeight + config.verticalSpacing;
    });

    // 间隔
    currentY += config.verticalSpacing;

    // 下方分支
    lowerChildren.forEach((child) => {
      const childHeight = getCachedHeight(child.id);
      const nodeH = this.getNodeHeight(child.id, config);
      const childY = currentY + childHeight / 2 - nodeH / 2;
      const childX = currentPos.x + config.horizontalSpacing;

      positions.set(child.id, { id: child.id, x: childX, y: childY });
      this.layoutSubtree(child.id, config, positions, depth + 1);

      currentY += childHeight + config.verticalSpacing;
    });
  }
}

// 布局引擎管理器
export class LayoutEngineManager {
  private static engines = new Map<LayoutType, LayoutEngine>();

  private static defaultEngine: LayoutType = 'tree-right';

  static {
    this.engines.set('tree-right', new TreeRightLayout());
    this.engines.set('tree-left', new TreeLeftLayout());
    this.engines.set('tree-top', new TreeTopLayout());
    this.engines.set('tree-bottom', new TreeBottomLayout());
    this.engines.set('radial', new RadialLayout());
    this.engines.set('fishbone', new FishboneLayout());
  }

  static getEngine(type: LayoutType): LayoutEngine {
    return this.engines.get(type) || this.engines.get(this.defaultEngine)!;
  }

  static getAvailableLayouts(): { type: LayoutType; name: string }[] {
    return [
      { type: 'tree-right' as LayoutType, name: '右侧树状' },
      { type: 'tree-left' as LayoutType, name: '左侧树状' },
      { type: 'tree-top' as LayoutType, name: '顶部树状' },
      { type: 'tree-bottom' as LayoutType, name: '底部树状' },
      { type: 'radial' as LayoutType, name: '径向分布' },
      { type: 'fishbone' as LayoutType, name: '鱼骨图' }
    ];
  }

  static applyLayout(
    nodes: MindmapNode[],
    type: LayoutType = 'tree-right',
    config?: Partial<LayoutConfig>
  ): LayoutResult {
    const engine = this.getEngine(type);
    const fullConfig: LayoutConfig = { ...defaultLayoutConfig, ...config, type };
    return engine.layout(nodes, fullConfig);
  }

  static setDefault(type: LayoutType): void {
    if (this.engines.has(type)) {
      this.defaultEngine = type;
    }
  }

  static register(type: LayoutType, engine: LayoutEngine): void {
    this.engines.set(type, engine);
  }
}

export const layoutEngine = LayoutEngineManager;
