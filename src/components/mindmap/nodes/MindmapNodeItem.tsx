/**
 * HeySure AI - 思维导图节点项组件
 * 负责单个思维导图节点的渲染和交互，包括：
 * - 节点名称显示和编辑（双击进入编辑模式）
 * - 节点选中状态显示
 * - 节点折叠/展开状态
 * - 节点颜色显示
 * - 跳转到流程编辑器功能
 * - 节点搜索结果高亮显示
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { flowStorage } from '@/components/flow/flow-storage';
import { MindmapNode, PendingChange } from '../types';
import { NODE_WIDTH, NODE_HEIGHT, NODE_COLORS } from '../constants';
import type { SearchResult } from '../hooks/useNodeSearch';

interface MindmapNodeItemProps {
  node: MindmapNode;
  isSelected: boolean;
  isEditing: boolean;
  editingName: string;
  setEditingName: (name: string) => void;
  onNodeClick?: (node: MindmapNode) => void;
  onNodeDoubleClick: (node: MindmapNode) => void;
  onUpdateNodeName: (id: string, name: string) => void;
  setEditingNodeId: (id: string | null) => void;
  onToggleCollapse: (id: string) => void;
  showFullContent: boolean;
  position: { x: number; y: number };
  pendingChange?: PendingChange;
  hasChildren: boolean;
  handleKeepChange: (id: string) => void;
  handleRevertChange: (id: string) => void;
  showColorPicker: boolean;
  onUpdateNodeColor: (id: string, color: string) => void;
  setShowColorPicker: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  // 节点搜索相关 props
  searchResults?: SearchResult[];
  onShowSearchMenu?: (e: React.MouseEvent, nodeName: string) => void;
  onNavigateToNode?: (result: SearchResult) => void;
}

export const MindmapNodeItem: React.FC<MindmapNodeItemProps> = ({
  node,
  isSelected,
  isEditing,
  editingName,
  setEditingName,
  onNodeClick,
  onNodeDoubleClick,
  onUpdateNodeName,
  setEditingNodeId,
  onToggleCollapse,
  showFullContent,
  position,
  pendingChange,
  hasChildren,
  handleKeepChange,
  handleRevertChange,
  showColorPicker,
  onUpdateNodeColor,
  setShowColorPicker,
  setSelectedNodeId,
  // 节点搜索相关
  searchResults = [],
  onShowSearchMenu,
  onNavigateToNode
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [flowSuggestions, setFlowSuggestions] = React.useState<{id: string, name: string}[]>([]);
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = React.useState<{ top: number, left: number, width: number } | null>(null);
  
  React.useEffect(() => {
    if (isEditing && node.type === 'process-trigger') {
      const flows = flowStorage.getAllFlows().map(f => ({ id: f.id, name: f.name || '' }));
      setFlowSuggestions(flows);
    }
  }, [isEditing, node.type]);

  React.useLayoutEffect(() => {
    if (isEditing && node.type === 'process-trigger' && inputWrapperRef.current) {
      const updatePosition = () => {
        if (inputWrapperRef.current) {
          const rect = inputWrapperRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.max(rect.width, 180)
          });
        }
      };

      updatePosition();
      // Add resize/scroll listeners to update position if needed
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [isEditing, node.type, position]);

  const handleProcessTriggerBlur = () => {
    // Only handle blur update if it's a process trigger or if we are not in system view
    // Since isSystemView isn't passed here, we rely on the parent (MindmapCanvas/Controller) to control editing state.
    // However, onBlur here unconditionally calls onUpdateNodeName, which might trigger errors for system nodes
    // because system nodes are not in mindmapStorage.

    // If we are editing, it means we are allowed to edit.
    // The issue is that onBlur triggers update, and update fails for system nodes.
    // System nodes should NEVER enter editing state (isEditing should be false).
    
    // If we are here, isEditing is true.
    if (node.type !== 'process-trigger') {
       onUpdateNodeName(node.id, editingName);
       return;
    }

    if (!editingName.trim()) {
        onUpdateNodeName(node.id, '');
        return;
    }
    
    const exists = flowSuggestions.some(f => f.name === editingName);
    if (!exists) {
        toast({ title: '未找到该操作流程', description: `流程 "${editingName}" 不存在`, variant: 'destructive' });
        onUpdateNodeName(node.id, '');
    } else {
        onUpdateNodeName(node.id, editingName);
    }
  };

  let boxShadow = isSelected ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)';
  if (pendingChange) {
      let haloColor = '';
      switch (pendingChange.action.type) {
        case 'add': haloColor = '#1d4ed8'; break;
        case 'delete': haloColor = '#ef4444'; break;
        case 'rename': haloColor = '#facc15'; break;
        case 'move': haloColor = '#ffffff'; break;
      }
      if (haloColor) {
        boxShadow = `0 0 15px 4px ${haloColor}, 0 0 0 2px ${haloColor}, ${boxShadow}`;
      }
  }

  // 检查节点是否在选择框内
  const nodeStyle: React.CSSProperties = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    width: NODE_WIDTH,
    height: showFullContent ? 'auto' : NODE_HEIGHT,
    minHeight: NODE_HEIGHT,
    whiteSpace: showFullContent ? 'normal' : 'nowrap',
    wordBreak: showFullContent ? 'break-word' : 'normal',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: node.color || '#3b82f6',
    zIndex: isEditing ? 1000 : (isSelected ? 100 : 1),
    border: isSelected ? '2px solid #1d4ed8' : '2px solid transparent',
    boxShadow,
    overflow: isEditing && node.type === 'process-trigger' ? 'visible' : undefined,
    position: 'absolute', // Added explicitly
    top: 0,
    left: 0
  };

  return (
      <React.Fragment>
        <div
          className={`mindmap-node ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
          style={nodeStyle}
          onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); onNodeClick?.(node); }}
          onDoubleClick={async (e) => {
            e.stopPropagation();
            if (node.type === 'process-trigger' && e.ctrlKey) {
              const allFlows = flowStorage.getAllFlows();
              const flow = allFlows.find(f => f.name === node.name);
              
              if (flow) {
                toast({ title: '正在跳转', description: `正在打开流程: ${flow.name}` });
                await flowStorage.switchFlow(flow.id);
                navigate('/flow', { state: { autoRun: false } });
              } else {
                toast({ 
                  title: '无法跳转', 
                  description: `未找到名为 "${node.name}" 的操作流程`, 
                  variant: 'destructive' 
                });
              }
            } else {
              onNodeDoubleClick(node);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (node.data?.isDirectory || node.data?.isDrive || hasChildren) {
              onToggleCollapse(node.id);
            } else if (onShowSearchMenu) {
              onShowSearchMenu(e, node.name);
            }
          }}
        >
          {isEditing ? (
            <div ref={inputWrapperRef} className="relative w-full h-full flex items-center justify-center">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleProcessTriggerBlur}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === 'Escape') {
                    setEditingNodeId(null); 
                  }
                }}
                autoFocus
                className="node-edit-input w-full h-full bg-transparent border-none outline-none text-center"
                aria-label={node.type === 'process-trigger' ? "选择操作流程" : "编辑节点名称"}
                placeholder={node.type === 'process-trigger' ? "选择或输入流程..." : undefined}
                style={{ color: 'inherit' }}
              />
              {node.type === 'process-trigger' && dropdownPosition && createPortal(
                <div 
                  className="fixed max-h-[200px] overflow-y-auto bg-popover text-popover-foreground rounded-md border shadow-md z-[9999]"
                  style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {flowSuggestions
                    .filter(f => (f.name || '').toLowerCase().includes((editingName || '').toLowerCase()))
                    .map(f => (
                      <div
                        key={f.id}
                        className="px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left"
                        onClick={() => {
                          onUpdateNodeName(node.id, f.name);
                          setEditingNodeId(null);
                        }}
                      >
                        {f.name}
                      </div>
                    ))}
                  {flowSuggestions.length === 0 && (
                     <div className="px-3 py-2 text-sm text-muted-foreground text-center">无可用流程</div>
                  )}
                  {flowSuggestions.length > 0 && flowSuggestions.filter(f => (f.name || '').toLowerCase().includes((editingName || '').toLowerCase())).length === 0 && (
                     <div className="px-3 py-2 text-sm text-muted-foreground text-center">无匹配流程</div>
                  )}
                </div>,
                document.body
              )}
            </div>
          ) : (
            <>
              {/* 重复序号标记 */}
              {node.duplicateIndex && (
                <span 
                  className="absolute -left-1 -top-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md"
                  title={`第 ${node.duplicateIndex} 个同名节点`}
                >
                  {node.duplicateIndex}
                </span>
              )}
              <span className="node-content">{node.name}</span>
              {hasChildren && (
                <div className="collapse-toggle" onClick={(e) => { e.stopPropagation(); onToggleCollapse(node.id); }}>
                  {node.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </div>
              )}
            </>
          )}
        </div>

        {pendingChange && (
          <div
            className="absolute z-50 bg-background border rounded-md shadow-md px-2 py-1 flex items-center gap-1"
            style={{ 
              transform: `translate(${position.x}px, ${position.y + NODE_HEIGHT + 6}px)`, 
              width: 'max-content',
              top: 0,
              left: 0
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="outline" size="sm" onClick={() => handleKeepChange(pendingChange.id)}>保留</Button>
            <Button variant="outline" size="sm" onClick={() => handleRevertChange(pendingChange.id)}>撤回</Button>
          </div>
        )}

        {showColorPicker && (
          <div className="color-picker" style={{ position: 'absolute', left: position.x + NODE_WIDTH + 10, top: position.y }} onClick={(e) => e.stopPropagation()}>
            {NODE_COLORS.map(color => (
              <button
                key={color}
                className={`color-option ${node.color === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => { onUpdateNodeColor(node.id, color); setShowColorPicker(null); }}
                aria-label={`选择颜色 ${color}`}
              />
            ))}
          </div>
        )}
      </React.Fragment>
  );
};
