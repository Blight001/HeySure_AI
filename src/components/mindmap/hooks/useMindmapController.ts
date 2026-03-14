/**
 * HeySure AI - 思维导图控制器 Hook
 * 整合所有思维导图编辑相关的功能和状态：
 * - 思维导图状态管理
 * - 分类管理
 * - 视图控制
 * - 节点选择
 * - 节点操作
 * - 快捷键处理
 * - 自动布局
 * - 布局计算
 * - 画布事件
 * - AI 功能
 * - 模型管理
 * - 剪贴板操作
 * - 搜索功能
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useMindmapState } from './useMindmapState';
import { useMindmapCategory } from './useMindmapCategory';
import { useMindmapView } from './useMindmapView';
import { useMindmapSelection } from './useMindmapSelection';
import { useNodeOperations } from './useNodeOperations';
import { useMindmapShortcuts } from './useMindmapShortcuts';
import { useAutoLayout } from './useAutoLayout';
import { useMindmapLayout } from './useMindmapLayout';
import { useMindmapCanvasEvents } from './useMindmapCanvasEvents';
import { useMindmapAI } from './useMindmapAI';
import { useMindmapModels } from './useMindmapModels';
import { useClipboard } from './useClipboard';
import { useMapOperations } from './useMapOperations';
import { useNodeSearch } from './useNodeSearch';
import { useMindmapInitialization } from './useMindmapInitialization';
import { mindmapStorage } from '../services/mindmap-storage';
import { MindmapNode } from '../types';
import { useUiStore } from '@/stores';
import { calculateCenterPan } from '../utils/view-utils';
import { getDrives, readDirStat, openFile } from '../../../services/fileSystem';
import { v4 as uuidv4 } from 'uuid';
import { layoutEngine } from '../services/layout-engine';

interface UseMindmapControllerProps {
  onNodeClick?: (node: MindmapNode) => void;
}

export const useMindmapController = ({ onNodeClick: propOnNodeClick }: UseMindmapControllerProps) => {
  const { chatMode } = useUiStore();
  
  // 1. 基础状态
  const mindmapState = useMindmapState();
  const {
    nodes, setNodes,
    nodeIndex, setNodeIndex,
    mapName, setMapName,
    mapId, setMapId,
    layoutType, setLayoutType,
    currentTheme, setCurrentTheme,
    layoutRefreshRef,
  } = mindmapState;

  // 2. 视图状态 (缩放、平移)
  const viewState = useMindmapView(mapId);
  const {
    scale, setScale,
    pan, setPan,
    isDraggingCanvas,
  } = viewState;

  // 3. 选择与编辑状态
  const selectionState = useMindmapSelection();
  const {
    selectedNodeId, setSelectedNodeId,
    selectedNodeIds, setSelectedNodeIds,
    editingNodeId, setEditingNodeId,
    editingName, setEditingName,
    showColorPicker, setShowColorPicker,
    selectionBox, setSelectionBoxState,
    addToSelection,
    clearSelection,
  } = selectionState;

  // 4. 剪贴板状态
  const {
    clipboardData, setClipboardData,
    isCut, setIsCut
  } = useClipboard();

  // 5. 模型配置
  const modelState = useMindmapModels(mapId);
  const {
    models,
    selectedModelId, setSelectedModelId,
    allowReadMindmap, setAllowReadMindmap,
    allowAiEdit, setAllowAiEdit
  } = modelState;

  // 6. UI 状态
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  // 16. 系统文件夹逻辑 (Moved up for useAutoLayout dependency)
  const [isSystemView, setIsSystemView] = useState(false);
  const [systemDrives, setSystemDrives] = useState<string[]>([]);
  const [currentSystemPath, setCurrentSystemPath] = useState<string>('系统文件夹');

  // 7. 自动布局计算
  const autoLayoutState = useAutoLayout(
    nodes, 
    setNodes, 
    setNodeIndex, 
    currentTheme, 
    layoutRefreshRef,
    isSystemView,
    layoutType
  );
  const {
    showFullContent, setShowFullContent,
    showLayoutDropdown, setShowLayoutDropdown
  } = autoLayoutState;

  // 8. 地图操作 (导入导出、撤销重做等)
  const mapOps = useMapOperations({
    setNodes,
    setNodeIndex,
    setCurrentTheme,
    setLayoutType,
    setMapName,
    setPan,
    setScale,
    layoutRefreshRef,
    mapName,
    setShowLayoutDropdown,
    setShowThemeDropdown
  });

  const refreshMap = mapOps.refreshMap;

  // 9. 分类管理
  const categoryState = useMindmapCategory({
    refreshMap,
    setMapId,
    mapId: mapId || ''
  });

  // 10. 节点操作 (CRUD)
  const nodeOps = useNodeOperations({
    nodes,
    setNodes,
    nodeIndex,
    setNodeIndex,
    selectedNodeId,
    setSelectedNodeId,
    selectedNodeIds,
    setSelectedNodeIds,
    setEditingNodeId,
    setEditingName,
    layoutRefreshRef,
    clipboardData,
    setClipboardData,
    isCut,
    setIsCut
  });

  // 11. 视觉布局
  const rootNode = nodes.find(n => n.isRoot);
  const layoutState = useMindmapLayout(nodes, nodeIndex, rootNode, currentTheme);
  const {
    getVisibleChildren,
    nodePositions,
    connectionsElement,
  } = layoutState;

  // 12. AI 功能
  const aiState = useMindmapAI({
    nodes,
    setNodes,
    setNodeIndex,
    refreshMap,
    mapName,
    allowReadMindmap,
    allowAiEdit
  });

  // 13. 画布交互
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitializedView = useRef(false);

  // 14. 跨文件节点搜索与切换
  const handleSwitchToMap = useCallback(async (targetMapId: string, targetNodeId: string) => {
    // 只有当目标导图与当前导图不同时才切换
    if (targetMapId !== mapId) {
      await categoryState.handleSwitchMap(targetMapId);
      await mindmapStorage.switchMap(targetMapId);
      refreshMap();
    }
    
    // 选中新节点并将其居中显示
    setTimeout(() => {
      setSelectedNodeId(targetNodeId);
      
      const container = containerRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const targetNode = mindmapStorage.getNodeIndex()[targetNodeId];
        
        if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
          // Calculate center position using utility
          // Assuming node center offset (half width/height)
          const nodeCenterX = targetNode.x + 75; 
          const nodeCenterY = targetNode.y + 20; 
          
          const newPan = calculateCenterPan(
            containerRect.width,
            containerRect.height,
            nodeCenterX,
            nodeCenterY,
            scale,
            0 // No extra offset for node focusing
          );
          
          setPan(newPan);
        }
      }
    }, 150);
  }, [categoryState, refreshMap, setSelectedNodeId, scale, setPan, mapId]);

  const nodeSearch = useNodeSearch({
    currentMapId: mapId,
    onSwitchMap: handleSwitchToMap
  });

  const canvasEvents = useMindmapCanvasEvents({
    scale,
    setScale,
    pan,
    setPan,
    canvasRef,
    models,
    selectedModelId,
    setFloatingChatOpen: aiState.setFloatingChatOpen,
    setFloatingChatModel: aiState.setFloatingChatModel,
    setFloatingChatPosition: aiState.setFloatingChatPosition,
    floatingChatModel: aiState.floatingChatModel,
    nodePositions,
    setSelectionBoxState,
    addToSelection,
    clearSelection,
    selectedNodeId,
    nodeIndex,
    onCtrlWheelSearch: (direction, nodeId, nodeName) => {
      console.log('[Mindmap] Ctrl+Wheel search:', { direction, nodeId, nodeName });
      const result = nodeSearch.handleWheelSearch(direction, nodeId, nodeName);
      if (result) {
        nodeSearch.navigateToNode(result);
      }
    }
  });

  // 15. 快捷键
  useMindmapShortcuts({
    selectedNodeId,
    selectedNodeIds,
    editingNodeId,
    setEditingNodeId,
    setEditingName,
    setSelectedNodeId,
    setShowColorPicker,
    nodeIndex,
    clipboardData,
    isCut,
    handleAddChild: nodeOps.handleAddChild,
    handleAddProcessTrigger: nodeOps.handleAddProcessTrigger,
    handleAddSibling: nodeOps.handleAddSibling,
    handleDeleteNode: nodeOps.handleDeleteNode,
    handleCopyNode: nodeOps.handleCopyNode,
    handleCutNode: nodeOps.handleCutNode,
    handlePasteNode: nodeOps.handlePasteNode,
    handleUndo: mapOps.handleUndo,
    handleRedo: mapOps.handleRedo
  });

  // 16. 系统文件夹逻辑
  // const [isSystemView, setIsSystemView] = useState(false); // Moved up
  // const [systemDrives, setSystemDrives] = useState<string[]>([]); // Moved up
  // const [currentSystemPath, setCurrentSystemPath] = useState<string>('系统文件夹'); // Moved up

  // Reset system view when mapId changes to a valid ID (e.g. user switches map)
  useEffect(() => {
    if (mapId) {
      setIsSystemView(false);
    }
  }, [mapId]);

  const handleOpenSystemFolder = useCallback(async () => {
    try {
      const drives = await getDrives();
      console.log('Got drives:', drives);
      setSystemDrives(drives);
      const rootId = uuidv4();
      
      const driveNodes = drives.map((drive, index) => ({
        id: uuidv4(),
        name: drive, // Use name instead of text
        parentId: rootId,
        x: 200,
        y: index * 60,
        data: { isDrive: true, path: drive, depth: 1, isDirectory: true },
        children: [], // Initialize children array
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        lastUsed: new Date().toISOString(),
        contexts: []
      }));

      const rootNode: MindmapNode = {
        id: rootId,
        name: '系统文件夹', // Use name instead of text
        parentId: null,
        x: 0,
        y: 0,
        isRoot: true,
        data: { isRoot: true, isSystemRoot: true, expanded: true },
        children: driveNodes.map(d => d.id), // Populate children array
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        lastUsed: new Date().toISOString(),
        contexts: []
      };

      const newNodes = [rootNode, ...driveNodes];
      const newIndex: Record<string, MindmapNode> = {};
      newNodes.forEach(n => newIndex[n.id] = n);

      // Perform layout calculation before setting state
      const layoutResult = layoutEngine.applyLayout(newNodes, layoutType);
      
      // Update nodes with calculated positions
      const layoutedNodes = newNodes.map(node => {
        const pos = layoutResult.positions.get(node.id);
        if (pos) {
          return { ...node, x: pos.x, y: pos.y };
        }
        return node;
      });

      const finalIndex: Record<string, MindmapNode> = {};
      layoutedNodes.forEach(n => finalIndex[n.id] = n);
      
      setNodes(layoutedNodes);
      setNodeIndex(finalIndex);
      setMapId(null); // Clear mapId to prevent overwriting existing map
      setMapName('系统文件夹');
      setCurrentSystemPath('系统文件夹');
      setIsSystemView(true);
      setSelectedNodeId(null);
      
      // Force relayout view
      layoutRefreshRef.current++;
    } catch (error) {
      console.error('Failed to open system folder:', error);
    }
  }, [setNodes, setNodeIndex, setMapName, layoutRefreshRef, setSelectedNodeId, layoutType]);

  const handleOpenSystemDrive = useCallback(async (drive: string) => {
    try {
      // Helper function to recursively fetch directory contents
      const buildDriveTree = async (currentPath: string, parentId: string | null, depth: number, maxDepth: number): Promise<MindmapNode[]> => {
        const nodeId = uuidv4();
        const nodeName = parentId === null ? drive : currentPath.split('\\').pop() || currentPath;
        
        const node: MindmapNode = {
          id: nodeId,
          name: nodeName,
          parentId,
          x: 0,
          y: 0,
          data: { 
            path: currentPath,
            depth,
            isDirectory: true,
            isFile: false,
            expanded: depth < maxDepth,
            isRoot: parentId === null,
            isSystemRoot: parentId === null,
            isDrive: parentId === null
          },
          color: '#06b6d4', // Cyan for folders (was #facc15)
          collapsed: depth >= maxDepth,
          children: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0,
          lastUsed: new Date().toISOString(),
          contexts: []
        };

        if (parentId === null) {
            node.isRoot = true;
        }

        let allNodes = [node];

        if (depth < maxDepth) {
          try {
            // Ensure path ends with slash for drives like 'C:'
            const readPath = currentPath.endsWith(':') ? `${currentPath}\\` : currentPath;
            let items = await readDirStat(readPath);
            
            // Limit items to prevent performance issues with huge directories
            const MAX_ITEMS_PER_DIR = 100;
            if (items.length > MAX_ITEMS_PER_DIR) {
              console.warn(`Directory ${readPath} has ${items.length} items, limiting to ${MAX_ITEMS_PER_DIR}`);
              items = items.slice(0, MAX_ITEMS_PER_DIR);
            }
            
            for (const item of items) {
              const childPath = `${readPath}${readPath.endsWith('\\') ? '' : '\\'}${item.name}`;
              if (item.isDirectory) {
                const childNodes = await buildDriveTree(childPath, nodeId, depth + 1, maxDepth);
                node.children.push(childNodes[0].id);
                allNodes = allNodes.concat(childNodes);
              } else {
                const fileNodeId = uuidv4();
                node.children.push(fileNodeId);
                allNodes.push({
                  id: fileNodeId,
                  name: item.name,
                  parentId: nodeId,
                  x: 0,
                  y: 0,
                  data: {
                    path: childPath,
                    depth: depth + 1,
                    isDirectory: false,
                    isFile: true
                  },
                  children: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  usageCount: 0,
                  lastUsed: new Date().toISOString(),
                  contexts: []
                });
              }
            }
          } catch (e) {
            console.error(`Failed to read directory ${currentPath}:`, e);
            // If we fail to read a directory (e.g. permission denied), we just don't add its children
            node.data.expanded = false;
          }
        }

        return allNodes;
      };

      const newNodes = await buildDriveTree(drive.endsWith('\\') ? drive.slice(0, -1) : drive, null, 0, 1);
      const newIndex: Record<string, MindmapNode> = {};
      newNodes.forEach(n => newIndex[n.id] = n);

      // Perform layout calculation before setting state
      const layoutResult = layoutEngine.applyLayout(newNodes, layoutType);

      // Update nodes with calculated positions
      const layoutedNodes = newNodes.map(node => {
        const pos = layoutResult.positions.get(node.id);
        if (pos) {
          return { ...node, x: pos.x, y: pos.y };
        }
        return node;
      });

      const finalIndex: Record<string, MindmapNode> = {};
      layoutedNodes.forEach(n => finalIndex[n.id] = n);

      setNodes(layoutedNodes);
      setNodeIndex(finalIndex);
      setMapName(drive);
      setCurrentSystemPath(drive);
      setIsSystemView(true);
      setSelectedNodeId(null);
      layoutRefreshRef.current++;
      
      // We might need to call setPan or setScale here if we want to center the view explicitly,
      // but let's rely on useMindmapInitialization for now which centers on root load
    } catch (error) {
      console.error('Failed to open system drive:', error);
    }
  }, [setNodes, setNodeIndex, setMapName, layoutRefreshRef, setSelectedNodeId, layoutType]);

  const handleSystemNodeClick = useCallback(async (node: MindmapNode) => {
    // No depth limit for system file view
    const currentDepth = node.data?.depth || 0;

    const path = node.data?.path;
    if (!path) return;

    // Only directories can be expanded
    if (!node.data?.isDirectory && !node.data?.isDrive) return;

    // Check if already expanded
    if (node.data?.expanded) {
      // If expanded, collapse it (hide children but keep them in data if needed, or remove them)
      // For simplicity and memory management, let's remove children nodes and mark as collapsed
      
      // Recursive function to get all descendant IDs
      const getAllDescendantIds = (parentId: string, index: Record<string, MindmapNode>): string[] => {
        const parent = index[parentId];
        if (!parent || !parent.children) return [];
        let ids: string[] = [];
        for (const childId of parent.children) {
          ids.push(childId);
          ids = ids.concat(getAllDescendantIds(childId, index));
        }
        return ids;
      };

      const descendantIds = getAllDescendantIds(node.id, nodeIndex);
      const nodesToRemove = new Set(descendantIds);

      // Create new nodes array excluding descendants
      const updatedNodes = nodes.filter(n => !nodesToRemove.has(n.id)).map(n => {
        if (n.id === node.id) {
          return {
            ...n,
            collapsed: true,
            children: [], // Clear children references
            data: { ...n.data, expanded: false }
          };
        }
        return n;
      });

      const newIndex: Record<string, MindmapNode> = {};
      updatedNodes.forEach(n => newIndex[n.id] = n);

      // Perform layout calculation before setting state
      const layoutResult = layoutEngine.applyLayout(updatedNodes, layoutType);

      // Update nodes with calculated positions
      const layoutedNodes = updatedNodes.map(n => {
        const pos = layoutResult.positions.get(n.id);
        if (pos) {
          return { ...n, x: pos.x, y: pos.y };
        }
        return n;
      });

      const finalIndex: Record<string, MindmapNode> = {};
      layoutedNodes.forEach(n => finalIndex[n.id] = n);
      
      setNodes(layoutedNodes);
      setNodeIndex(finalIndex);
      layoutRefreshRef.current++;
      return;
    }

    try {
      let items = await readDirStat(path);
      
      const childNodes: MindmapNode[] = items.map((item, index) => ({
        id: uuidv4(),
        name: item.name, // Use name instead of text
        parentId: node.id,
        x: (node.x || 0) + 200, // Initial position, layout will fix
        y: (node.y || 0) + index * 40,
        data: { 
          path: `${path}${path.endsWith('\\') ? '' : '\\'}${item.name}`,
          depth: currentDepth + 1,
          isDirectory: item.isDirectory,
          isFile: item.isFile,
          expanded: false
        },
        color: item.isDirectory ? '#06b6d4' : undefined, // Cyan for folders
        collapsed: item.isDirectory,
        children: [], // Initialize children array
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        lastUsed: new Date().toISOString(),
        contexts: []
      }));

      // Update parent node to be expanded
      const updatedParent = { 
        ...node, 
        collapsed: false,
        children: childNodes.map(c => c.id), // Populate children IDs
        data: { ...node.data, expanded: true } 
      };

      // Create new nodes array: replace parent, add children
      const updatedNodes = nodes.map(n => n.id === node.id ? updatedParent : n).concat(childNodes);
      
      const newIndex: Record<string, MindmapNode> = {};
      updatedNodes.forEach(n => newIndex[n.id] = n);

      // Perform layout calculation before setting state
      const layoutResult = layoutEngine.applyLayout(updatedNodes, layoutType);

      // Update nodes with calculated positions
      const layoutedNodes = updatedNodes.map(n => {
        const pos = layoutResult.positions.get(n.id);
        if (pos) {
          return { ...n, x: pos.x, y: pos.y };
        }
        return n;
      });

      const finalIndex: Record<string, MindmapNode> = {};
      layoutedNodes.forEach(n => finalIndex[n.id] = n);
      
      setNodes(layoutedNodes);
      setNodeIndex(finalIndex);
      layoutRefreshRef.current++;
    } catch (error) {
      console.error('Failed to expand directory:', error);
    }
  }, [nodes, setNodes, setNodeIndex, layoutRefreshRef, layoutType]);

  // 17. 初始化加载
  useMindmapInitialization({
    nodes,
    setPan,
    setScale,
    containerRef,
    hasInitializedView,
    setMapId,
    setMapName,
    setCurrentTheme,
    setSelectedModelId,
    setAllowReadMindmap,
    setAllowAiEdit,
    refreshCategoryData: categoryState.refreshCategoryData,
    refreshMap
  });

  const handleNodeClick = useCallback((node: MindmapNode) => {
    setSelectedNodeId(node.id);
    
    // Disable default system node click handler (which was expanding on click)
    // Expansion is now handled via context menu (right click) or collapse toggle
    /*
    if (isSystemView) {
      handleSystemNodeClick(node);
    }
    */

    if (propOnNodeClick) {
      propOnNodeClick(node);
    }
  }, [setSelectedNodeId, propOnNodeClick, isSystemView]);

  return {
    // Props for Header
    headerProps: {
      currentTheme,
      mapName,
      mapId,
      categories: categoryState.categories,
      selectedCategory: categoryState.selectedCategory,
      mapsInCategory: categoryState.mapsInCategory,
      showCategoryDropdown: categoryState.showCategoryDropdown,
      setShowCategoryDropdown: categoryState.setShowCategoryDropdown,
      showMapDropdown: categoryState.showMapDropdown,
      setShowMapDropdown: categoryState.setShowMapDropdown,
      newCategoryName: categoryState.newCategoryName,
      setNewCategoryName: categoryState.setNewCategoryName,
      handleCreateCategory: categoryState.handleCreateCategory,
      isEditingCategory: categoryState.isEditingCategory,
      editingCategoryName: categoryState.editingCategoryName,
      setEditingCategoryName: categoryState.setEditingCategoryName,
      saveCategoryName: categoryState.saveCategoryName,
      startEditCategory: categoryState.startEditCategory,
      handleDeleteCategory: categoryState.handleDeleteCategory,
      handleSwitchCategory: categoryState.handleSwitchCategory,
      handleCreateMap: categoryState.handleCreateMap,
      handleDeleteMap: categoryState.handleDeleteMap,
      handleDeleteMapById: categoryState.handleDeleteMapById,
      handleSwitchMap: categoryState.handleSwitchMap,
      editingListMapId: categoryState.editingListMapId,
      setEditingListMapId: categoryState.setEditingListMapId,
      editingListMapName: categoryState.editingListMapName,
      setEditingListMapName: categoryState.setEditingListMapName,
      handleSaveListMap: categoryState.handleSaveListMap,
      startEditListMap: categoryState.startEditListMap,
      newMapName: categoryState.newMapName,
      setNewMapName: categoryState.setNewMapName,
      
      // New props moved from Toolbar or added
      layoutType,
      onSwitchLayout: mapOps.handleSwitchLayout,
      onSwitchTheme: mapOps.handleSwitchTheme,
      selectedModelId,
      models,
      onSelectModel: setSelectedModelId,
      onExport: mapOps.handleExport,
      onImport: mapOps.handleImport,
      allowReadMindmap,
      allowAiEdit,
      onAllowReadChange: setAllowReadMindmap,
      onAllowEditChange: setAllowAiEdit,
      onSave: isSystemView ? async () => {} : mapOps.handleSave,
      onOpenSystemFolder: handleOpenSystemFolder,
      isSystemView,
      systemDrives,
      onOpenSystemDrive: handleOpenSystemDrive,
      currentSystemPath
    },
    // Props for Toolbar
    toolbarProps: {
      currentTheme,
      selectedNodeId,
      showColorPicker,
      scale,
      showFullContent,
      canUndo: isSystemView ? false : mapOps.canUndo,
      canRedo: isSystemView ? false : mapOps.canRedo,
      onAddChild: isSystemView ? () => {} : nodeOps.handleAddChild,
      onAddProcessTrigger: isSystemView ? undefined : nodeOps.handleAddProcessTrigger,
      onDeleteNode: isSystemView ? () => {} : nodeOps.handleDeleteNode,
      onShowColorPicker: isSystemView ? () => {} : setShowColorPicker,
      onUndo: isSystemView ? () => {} : mapOps.handleUndo,
      onRedo: isSystemView ? () => {} : mapOps.handleRedo,
      onZoomIn: () => canvasEvents.updateScale(scale + 0.1),
      onZoomOut: () => canvasEvents.updateScale(scale - 0.1),
      onRelayout: mapOps.handleRelayout,
      onToggleFullContent: setShowFullContent,
      onOpenAiChat: () => {
        // 打开在屏幕中央
        canvasEvents.openFloatingChatAt(window.innerWidth / 2 - 190, window.innerHeight / 2 - 260);
      },
    },
    // Props for Canvas
    canvasProps: {
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
      pendingChanges: aiState.pendingChanges,
      canvasRef,
      onCanvasMouseDown: canvasEvents.handleCanvasMouseDown,
      onCanvasMouseMove: canvasEvents.handleCanvasMouseMove,
      onCanvasMouseUp: canvasEvents.handleCanvasMouseUp,
      onCanvasDoubleClick: canvasEvents.handleCanvasDoubleClick,
      onCanvasClick: (_e?: React.MouseEvent<HTMLDivElement>) => {
        if (canvasEvents.wasInteracting()) return;
        setSelectedNodeId(null);
        setSelectedNodeIds([]);
        setShowColorPicker(null);
      },
      onNodeClick: handleNodeClick,
      onNodeDoubleClick: (node: MindmapNode) => {
        if (isSystemView) {
          if (node.data?.isFile && node.data?.path) {
            openFile(node.data.path);
          }
          // In system view, double click does not trigger edit mode for any node (file or folder)
          return;
        }
        setEditingNodeId(node.id);
        setEditingName(node.name);
        handleNodeClick(node);
      },
      onUpdateNodeName: nodeOps.handleUpdateNodeName,
      onToggleCollapse: nodeOps.handleToggleCollapse,
      onUpdateNodeColor: nodeOps.handleUpdateNodeColor,
      onKeepChange: aiState.handleKeepChange,
      onRevertChange: aiState.handleRevertChange,
      onKeepAll: aiState.handleKeepAll,
      onRevertAll: aiState.handleRevertAll,
      selectionBox,
      setSelectedNodeId,
      setSelectedNodeIds,
      setEditingNodeId,
      setShowColorPicker,
      searchResults: nodeSearch.searchResults,
      onShowSearchMenu: nodeSearch.showNodeSearchMenu,
      onNavigateToNode: nodeSearch.navigateToNode,
      showSearchMenu: nodeSearch.showSearchMenu,
      // Pass handleSystemNodeClick to canvas for manual expansion
      onSystemNodeExpand: isSystemView ? handleSystemNodeClick : undefined
    },
    // Props for Floating Chat
    floatingChatProps: {
      isOpen: aiState.floatingChatOpen,
      onClose: () => aiState.setFloatingChatOpen(false),
      position: aiState.floatingChatPosition,
      model: aiState.floatingChatModel || undefined,
      onResponse: aiState.handleAiResponse,
      contextAppendix: aiState.mindmapAppendixMd,
      // Helper to check if chat should be shown
      shouldShow: !!(aiState.floatingChatModel || chatMode === 'mindmap')
    },
    containerRef
  };
};
