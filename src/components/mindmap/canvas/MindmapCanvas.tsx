/**
 * HeySure AI - 思维导图画布组件
 * 负责思维导图的节点渲染和交互，包括：
 * - 节点递归渲染（支持多层级的树形结构）
 * - 画布拖拽、平移、缩放交互
 * - 节点选择、编辑、折叠操作
 * - 节点颜色选择器
 * - AI 变更确认浮窗（批量保留/撤回）
 * - 框选功能
 * - 节点搜索结果导航
 */
import React, { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MindmapNode, PendingChange } from '../types';
import type { ThemeConfig } from '@/types/theme';
import { MindmapNodeItem } from '../nodes/MindmapNodeItem';
import { NODE_WIDTH, NODE_HEIGHT, NODE_COLORS } from '../constants';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { SearchResult } from '../hooks/useNodeSearch';

interface MindmapCanvasProps {
  rootNode: MindmapNode | undefined;
  nodeIndex: Record<string, MindmapNode>;
  nodePositions: Record<string, { x: number; y: number }>;
  connectionsElement: React.ReactNode;
  getVisibleChildren: (nodeId: string) => MindmapNode[];

  scale: number;
  pan: { x: number; y: number };
  isDraggingCanvas: boolean;
  currentTheme: ThemeConfig;
  showFullContent: boolean;

  selectedNodeId: string | null;
  selectedNodeIds: string[];
  editingNodeId: string | null;
  editingName: string;
  setEditingName: (name: string) => void;
  showColorPicker: string | null;
  pendingChanges: Record<string, PendingChange>;

  canvasRef: React.RefObject<HTMLDivElement>;
  onCanvasMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onCanvasMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onCanvasMouseUp: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onCanvasDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onCanvasClick: (e?: React.MouseEvent<HTMLDivElement>) => void;

  onNodeClick: (node: MindmapNode) => void;
  onNodeDoubleClick: (node: MindmapNode) => void;
  onUpdateNodeName: (id: string, name: string) => void;
  onToggleCollapse: (id: string) => void;
  onUpdateNodeColor: (id: string, color: string) => void;

  onKeepChange: (id: string) => void;
  onRevertChange: (id: string) => void;
  onKeepAll?: () => void;
  onRevertAll?: () => void;

  selectionBox: { x: number; y: number; width: number; height: number } | null;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setEditingNodeId: (id: string | null) => void;
  setShowColorPicker: (id: string | null) => void;

  // 节点搜索相关 props
  searchResults?: SearchResult[];
  onShowSearchMenu?: (e: React.MouseEvent, nodeName: string) => void;
  onNavigateToNode?: (result: SearchResult) => void;
  showSearchMenu?: boolean;
  onSystemNodeExpand?: (node: MindmapNode) => void;
}

export const MindmapCanvas: React.FC<MindmapCanvasProps> = ({
  rootNode,
  nodeIndex,
  nodePositions,
  connectionsElement,
  getVisibleChildren,
  scale,
  pan,
  isDraggingCanvas,
  currentTheme,
  showFullContent,
  selectedNodeId,
  selectedNodeIds,
  editingNodeId,
  editingName,
  setEditingName,
  showColorPicker,
  pendingChanges,
  canvasRef,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCanvasDoubleClick,
  onCanvasClick,
  onNodeClick,
  onNodeDoubleClick,
  onUpdateNodeName,
  onToggleCollapse,
  onUpdateNodeColor,
  onKeepChange,
  onRevertChange,
  onKeepAll,
  onRevertAll,
  selectionBox,
  setSelectedNodeId,
  setSelectedNodeIds,
  setEditingNodeId,
  setShowColorPicker,
  // 节点搜索相关
  searchResults = [],
  onShowSearchMenu,
  onNavigateToNode,
  showSearchMenu = false,
  onSystemNodeExpand
}) => {
  
  const nodeChangeMap = useMemo(() => {
    const map: Record<string, PendingChange> = {};
    Object.values(pendingChanges).forEach(change => {
      if (change.action.type === 'add') {
         // 对于 add 操作，变更应该绑定到新创建的子节点上，而不是父节点
         if (change.action.nodeId) map[change.action.nodeId] = change;
      } else if (change.action.nodeId) {
         map[change.action.nodeId] = change;
      }
    });
    return map;
  }, [pendingChanges]);

  const isNodePendingDelete = useCallback((nodeId: string) => {
    let current = nodeIndex[nodeId];
    while (current) {
      const change = nodeChangeMap[current.id];
      if (change?.action.type === 'delete') return true;
      if (!current.parentId) break;
      current = nodeIndex[current.parentId];
    }
    return false;
  }, [nodeIndex, nodeChangeMap]);

  const renderNode = (node: MindmapNode): React.ReactNode => {
    const isSelected = selectedNodeId === node.id || selectedNodeIds.includes(node.id);
    const isEditing = editingNodeId === node.id;
    const children = getVisibleChildren(node.id);
    // Determine if it has children for display purposes.
    // For system folders, we show the expand button if it's a directory, even if children array is empty (lazy loading).
    const hasChildren = (node.children || []).length > 0 || (node.data?.isDirectory === true && node.data?.expanded === false);
    const pos = nodePositions[node.id] || { x: 0, y: 0 };
    const pendingChange = nodeChangeMap[node.id];
    
    // MindmapNodeItem handles its own rendering, but we need to pass position and other props
    // Also, MindmapNodeItem in the original code (lines 581-610) was inline.
    // The separate MindmapNodeItem component I examined earlier encapsulates the node content.
    // However, the recursion (children.map) was outside it.
    // And the pending change tooltip and color picker were outside it.
    
    // We'll use MindmapNodeItem for the node box itself.
    // And render tooltip/color picker/children here.

    return (
      <React.Fragment key={node.id}>
        <MindmapNodeItem
          key={node.id}
          node={node}
          isSelected={isSelected}
          isEditing={isEditing}
          editingName={editingName}
          setEditingName={setEditingName}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={(node) => {
            // Let the parent component handle whether to enter edit mode or not
            // MindmapController handles logic for system nodes vs regular nodes
            onNodeDoubleClick(node);
          }}
          onUpdateNodeName={onUpdateNodeName}
          setEditingNodeId={setEditingNodeId}
          onToggleCollapse={(id) => {
            if (onSystemNodeExpand) {
              onSystemNodeExpand(node);
            } else {
              onToggleCollapse(id);
            }
          }}
          showFullContent={showFullContent}
          position={pos}
          pendingChange={pendingChange}
          hasChildren={hasChildren}
          handleKeepChange={onKeepChange}
          handleRevertChange={onRevertChange}
          showColorPicker={showColorPicker === node.id}
          onUpdateNodeColor={onUpdateNodeColor}
          setShowColorPicker={setShowColorPicker}
          setSelectedNodeId={setSelectedNodeId}
          // 传递节点搜索相关 props
          searchResults={isSelected ? searchResults : []}
          onShowSearchMenu={onShowSearchMenu}
          onNavigateToNode={onNavigateToNode}
        />

        {/* Pending Change Tooltip */}
        {pendingChange && (
          <div
            className="absolute z-50 bg-background border rounded-md shadow-md px-2 py-2 flex flex-col gap-2 items-start min-w-[150px]"
            style={{ transform: `translate(${pos.x}px, ${pos.y + NODE_HEIGHT + 6}px)`, width: 'max-content' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-medium px-1 max-w-[200px] break-words text-foreground">
              {pendingChange.description}
            </div>
            <div className="flex items-center gap-2 w-full justify-end">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-green-100 hover:text-green-700" onClick={() => onKeepChange(pendingChange.id)}>保留</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-red-100 hover:text-red-700" onClick={() => onRevertChange(pendingChange.id)}>撤回</Button>
            </div>
          </div>
        )}

        {/* Color Picker */}
        {showColorPicker === node.id && (
          <div className="color-picker" style={{ left: pos.x + NODE_WIDTH + 10, top: pos.y, position: 'absolute', zIndex: 101, backgroundColor: currentTheme.nodeBackgroundColor, padding: '4px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
            {NODE_COLORS.map(color => (
              <button
                key={color}
                className={`color-option ${node.color === color ? 'active' : ''}`}
                style={{ backgroundColor: color, width: '20px', height: '20px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                onClick={() => { onUpdateNodeColor(node.id, color); setShowColorPicker(null); }}
                aria-label={`选择颜色 ${color}`}
              />
            ))}
          </div>
        )}

        {children.map(child => renderNode(child))}
      </React.Fragment>
    );
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div
      className={`mindmap-canvas ${isDraggingCanvas ? 'dragging' : ''}`}
      ref={canvasRef}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseUp}
      onClick={onCanvasClick}
      onDoubleClick={onCanvasDoubleClick}
      style={{
        backgroundColor: currentTheme.backgroundColor,
        backgroundImage: currentTheme.gridEnabled 
          ? `radial-gradient(${currentTheme.gridColor} 1px, transparent 1px)` 
          : 'none',
        backgroundSize: `${20 * scale}px ${20 * scale}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div 
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        {connectionsElement}
        <div className="mindmap-nodes">{rootNode && renderNode(rootNode)}</div>

        {/* 选择框 */}
        {selectionBox && (
          <div
            className="selection-box"
            style={{
              position: 'absolute',
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height,
              border: '2px solid #3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          />
        )}
      </div>

      {/* 全局 AI 变更确认浮窗 */}
      {hasPendingChanges && (
        <div
          className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4"
        >
          <span className="text-sm font-medium">AI 建议修改 ({Object.keys(pendingChanges).length})</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={onKeepAll} className="bg-green-600 hover:bg-green-700 text-white">
              全部保留
            </Button>
            <Button size="sm" variant="destructive" onClick={onRevertAll}>
              全部撤回
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
