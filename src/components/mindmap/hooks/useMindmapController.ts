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

  // 7. 自动布局计算
  const autoLayoutState = useAutoLayout(nodes, setNodes, setNodeIndex, currentTheme, layoutRefreshRef);
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

  // 16. 初始化加载
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
    if (propOnNodeClick) {
      propOnNodeClick(node);
    }
  }, [setSelectedNodeId, propOnNodeClick]);

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
      onSave: mapOps.handleSave,
    },
    // Props for Toolbar
    toolbarProps: {
      currentTheme,
      selectedNodeId,
      showColorPicker,
      scale,
      showFullContent,
      canUndo: mapOps.canUndo,
      canRedo: mapOps.canRedo,
      onAddChild: nodeOps.handleAddChild,
      onAddProcessTrigger: nodeOps.handleAddProcessTrigger,
      onDeleteNode: nodeOps.handleDeleteNode,
      onShowColorPicker: setShowColorPicker,
      onUndo: mapOps.handleUndo,
      onRedo: mapOps.handleRedo,
      onZoomIn: () => canvasEvents.updateScale(scale + 0.1),
      onZoomOut: () => canvasEvents.updateScale(scale - 0.1),
      onRelayout: mapOps.handleRelayout,
      onToggleFullContent: setShowFullContent,
      onOpenAiChat: () => {
        // 打开在屏幕中央
        canvasEvents.openFloatingChatAt(window.innerWidth / 2 - 190, window.innerHeight / 2 - 260);
      }
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
