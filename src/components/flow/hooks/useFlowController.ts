/**
 * HeySure AI - 流程控制器 Hook
 * 整合所有流程编辑相关的功能和状态：
 * - 画布缩放和平移
 * - 节点拖拽
 * - 节点连接
 * - 历史记录（撤销/重做）
 * - 流程数据管理
 * - 流程执行控制
 * - 模型管理
 * - AI 功能
 * - 节点选择和剪贴板
 * - 快捷键处理
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '@/stores';
import { useToast } from '@/hooks/use-toast';
import { useLatestRef } from '@/hooks/useLatestRef';
import { flowStorage } from '../flow-storage';
import { pythonRegistry } from '../python/core/PythonRegistry';
import {
  useCanvasZoom,
  useCanvasConnection,
  useCanvasDrag,
  useCanvasHistory,
  useFlowData,
  useFlowExecution,
  useFlowModels,
  useFlowAI,
  useFlowSelection,
  useFlowClipboard,
  useFlowShortcuts,
  useFlowCanvasInteraction,
  useFlowFloatingChat,
  useFlowResources
} from './index';
import { useFlowAutoSave } from './useFlowAutoSave';
import { useNodeOperations } from './useNodeOperations';

import type {
  PythonScriptConfig,
  FlowEdge,
  FlowNode as FlowNodeType,
  LocalModelConfig
} from '@/types/flow';
import {
  createBasicNode,
  createConditionNode,
  createParallelNode,
  createAggregateNode,
  createAIChatNode,
  createPythonNode,
  createSwitchNode,
  createTriggerNode,
  createSimpleTriggerNode,
} from '../core/types';
import { NODE_WIDTH, NODE_HEIGHT } from '../core/layout';

export function useFlowController() {
  const location = useLocation();
  const navigate = useNavigate();
  const { chatMode } = useUiStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // ==================== 1. 基础状态 ====================
  const [canvasNodes, setCanvasNodes] = useState<FlowNodeType[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<FlowEdge[]>([]);
  const [edgeToDelete, setEdgeToDelete] = useState<FlowEdge | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [nodeSizes, setNodeSizes] = useState<Map<string, { width: number; height: number }>>(new Map());
  const [animatingEdges, setAnimatingEdges] = useState<Set<string>>(new Set());

  const canvasNodesRef = useLatestRef(canvasNodes);
  const canvasEdgesRef = useLatestRef(canvasEdges);

  // 自动保存状态监听
  useEffect(() => {
    const unsubscribe = flowStorage.onSave(() => {
      console.log('FlowEditor: Auto-save event received');
      setSaveStatus('已自动保存');
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 1000);
    });
    return () => {
      unsubscribe();
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    };
  }, []);

  // ==================== 2. 历史记录 ====================
  const {
    history,
    historyIndex,
    saveToHistory,
    initHistory,
    clearHistory,
    undo,
    redo
  } = useCanvasHistory(canvasNodes, canvasEdges, setCanvasNodes, setCanvasEdges);

  useEffect(() => {
    if (canvasNodes.length > 0 || canvasEdges.length > 0) {
      initHistory();
    }
  }, [canvasNodes.length, canvasEdges.length, initHistory]);

  // ==================== 3. 视图状态 ====================
  const {
    zoom,
    pan,
    showGrid,
    animationSpeed,
    setZoom,
    setPan,
    setShowGrid,
    setAnimationSpeed,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    handleWheelZoom
  } = useCanvasZoom();
  const [connectionStrokeWidth, setConnectionStrokeWidth] = useState(2);

  // ==================== 4. 数据管理 ====================
  const {
    flowId,
    flowName,
    categories,
    selectedCategory,
    flowsInCategory,
    currentTheme,
    handleSwitchTheme,
    handleCreateCategory,
    handleDeleteCategory,
    handleSwitchCategory,
    handleRenameCategory,
    handleCreateFlow,
    handleDeleteFlow,
    handleSwitchFlow,
    handleRenameFlow,
    handleSaveFlow: saveFlowData,
    handleExportFlow,
    handleImportFlow,
    getAllFlowList
  } = useFlowData({
    setNodes: setCanvasNodes,
    setEdges: setCanvasEdges,
    setHistory: (h) => {
      if (Array.isArray(h) && h.length === 0) clearHistory();
    },
    setHistoryIndex: () => {},
    setZoom,
    setPan,
    setAnimationSpeed,
    setShowGrid,
    setConnectionStrokeWidth,
    zoom,
    pan,
    animationSpeed,
    showGrid,
    connectionStrokeWidth
  });

  // ==================== 5. 模型状态 ====================
  const {
    models,
    setModels,
    selectedModelId,
    setSelectedModelId,
    allowReadFlow,
    setAllowReadFlow,
    allowAiEdit,
    setAllowAiEdit,
    allowAiAutoExecution,
    setAllowAiAutoExecution
  } = useFlowModels(flowId);

  // ==================== 6. 执行引擎 ====================
  const {
    triggerDataTransfer,
    handleUserInputSend,
    handleToggleMemory,
    handleClearHistory,
    handleSwitchSend,
    handleTrigger,
    handleSimpleTrigger,
    flowStatus,
    runFlow,
    pauseFlow,
    stopFlow
  } = useFlowExecution({
    nodes: canvasNodes,
    setNodes: setCanvasNodes,
    edges: canvasEdges,
    animationSpeed,
    setAnimatingEdges,
    saveToHistory
  });

  // 自动运行逻辑
  const hasAutoRunRef = useRef(false);
  const runFlowRef = useRef(runFlow);
  useEffect(() => { runFlowRef.current = runFlow; }, [runFlow]);
  useEffect(() => { hasAutoRunRef.current = false; }, [flowId, location.key]);
  useEffect(() => {
    const hasStartNode = canvasNodes.some(n => n.type === 'start');
    if (location.state?.autoRun && flowId && hasStartNode && !hasAutoRunRef.current && flowStatus === 'idle') {
      hasAutoRunRef.current = true;
      navigate(location.pathname, { replace: true, state: { autoRun: false } });
      const timer = setTimeout(() => {
        toast({ title: '自动运行', description: '已根据指令自动运行流程' });
        runFlowRef.current();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.state, flowId, canvasNodes, flowStatus, toast, navigate, location.pathname]);

  // ==================== 7. 自动保存与节点操作 ====================
  const handleDeleteCanvasNode = useCallback((nodeId: string) => {
    setCanvasNodes(prev => prev.filter(node => node.id !== nodeId));
    setCanvasEdges(prev => prev.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    setTimeout(() => saveToHistory(), 0);
  }, [saveToHistory]);

  const handleSaveNode = async (nodeId: string) => {
    console.log('节点数据将随流程自动保存:', nodeId);
  };

  const { triggerNodeSave } = useFlowAutoSave({
    flowId,
    nodes: canvasNodes,
    edges: canvasEdges,
    theme: currentTheme,
    onSaveFlow: saveFlowData,
    onSaveNode: handleSaveNode
  });

  const handleManualSave = useCallback(() => {
    saveFlowData(canvasNodesRef.current, canvasEdgesRef.current);
  }, [saveFlowData, canvasNodesRef, canvasEdgesRef]);

  const { handleTogglePythonMode } = useNodeOperations(setCanvasNodes);

  const handleNodeDataChange = (nodeId: string, newData: any) => {
    setCanvasNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        let status = n.data?.status;
        if (newData.value !== undefined && newData.value !== '' && status !== 'running' && status !== 'completed') {
          status = 'idle';
        } else if (newData.value === '') {
          status = undefined;
        }
        return { ...n, data: { ...n.data, ...newData, status } };
      }
      return n;
    }));
    triggerNodeSave(nodeId);
  };

  const handleNodeResize = useCallback((nodeId: string, size: { width: number; height: number }) => {
    setNodeSizes(prev => {
      const next = new Map(prev);
      const current = next.get(nodeId);
      if (!current || current.width !== size.width || current.height !== size.height) {
        next.set(nodeId, size);
      }
      return next;
    });
  }, []);

  // ==================== 8. AI 辅助 ====================
  const {
    pendingChanges,
    flowAppendixMd,
    flowStructureMd,
    editInstructionsMd,
    handleAiResponse,
    handleKeepChange,
    handleRevertChange,
    handleKeepAll,
    handleRevertAll,
    pendingChangeState,
    previewElements
  } = useFlowAI({
    nodes: canvasNodes,
    edges: canvasEdges,
    setNodes: setCanvasNodes,
    setEdges: setCanvasEdges,
    allowReadFlow,
    allowAiEdit,
    allowAiAutoExecution,
    onNodeDataChange: handleNodeDataChange,
    onControlExecution: (command) => {
        if (command === 'run') runFlow();
        else if (command === 'pause') pauseFlow();
        else if (command === 'stop') stopFlow();
    },
    onSwitchFlow: handleSwitchFlow,
    availableFlows: useMemo(() => getAllFlowList(), [getAllFlowList, flowId])
  });

  const displayNodes = useMemo(() => [...canvasNodes, ...(previewElements?.nodes || [])], [canvasNodes, previewElements]);
  const displayEdges = useMemo(() => [...canvasEdges, ...(previewElements?.edges || [])], [canvasEdges, previewElements]);

  // ==================== 9. 连接与选择 ====================
  const connectionHook = useCanvasConnection({
    canvasRef,
    edges: canvasEdges,
    onEdgesChange: setCanvasEdges,
    onSaveHistory: saveToHistory
  });

  const {
    connectionState = { isConnecting: false, sourceNodeId: null, sourceHandleId: null, sourceHandleType: null, mouseX: 0, mouseY: 0 },
    handleStartConnection,
    handleCompleteConnection,
    handleDeleteEdge,
    updateConnectionPosition,
    cancelConnection
  } = connectionHook || {};

  const {
    selectedNodeIds,
    setSelectedNodeIds,
    isSelecting,
    selectionBox,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    toggleNodeSelection
  } = useFlowSelection(canvasRef, pan, zoom, canvasNodes, nodeSizes);

  // ==================== 10. 拖拽与交互 ====================
  const {
    draggingData,
    handleDragStart,
    handleDragOver,
    handleDrop: onCanvasDrop,
    handleDragEnd,
    startNodeDrag
  } = useCanvasDrag({
    canvasRef,
    nodes: canvasNodes,
    edges: canvasEdges,
    onNodesChange: setCanvasNodes,
    onEdgesChange: setCanvasEdges,
    onSaveHistory: saveToHistory,
    zoom,
    pan,
    selectedNodeIds
  });

  const handleDrop = (e: React.DragEvent) => {
    onCanvasDrop(e, (data, x, y) => {
      let newNode: FlowNodeType | null = null;
      if (data.type === 'basic' && data.nodeType) {
        switch (data.nodeType) {
          case 'simpleTrigger': newNode = createSimpleTriggerNode({ x, y }, data.label || '触发'); break;
          case 'switch': newNode = createSwitchNode({ x, y }, data.label || '开关'); break;
          case 'trigger': newNode = createTriggerNode({ x, y }, data.label || '触发器'); break;
          default: newNode = createBasicNode(data.nodeType, { x, y }, data.label || '节点', data.icon || '🟢');
        }
      } else if (data.type === 'condition') newNode = createConditionNode({ x, y });
      else if (data.type === 'parallel') newNode = createParallelNode({ x, y });
      else if (data.type === 'aggregate') newNode = createAggregateNode({ x, y });
      else if (data.type === 'aiChat') newNode = createAIChatNode({ x, y });
      else if (data.type === 'model' && data.model) newNode = createAIChatNode({ x, y }, data.model);
      else if (data.type === 'python' && data.component) newNode = createPythonNode({ x, y }, data.component);
      
      if (data.type === 'switch' && !newNode) newNode = createSwitchNode({ x, y }, data.label || '开关');
      if (data.type === 'trigger' && !newNode) newNode = createTriggerNode({ x, y }, data.label || '触发器');
      if (data.type === 'simpleTrigger' && !newNode) newNode = createSimpleTriggerNode({ x, y }, data.label || '触发');

      return newNode;
    });
  };

  const {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    isPanning
  } = useFlowCanvasInteraction({
    canvasRef,
    pan,
    setPan,
    zoom,
    connectionState,
    draggingData,
    updateConnectionPosition,
    cancelConnection,
    handleDragEnd,
    handleWheelZoom,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection
  });

  // ==================== 11. 资源、剪贴板与快捷键 ====================
  const { scripts, scriptComponents, isRefreshing, refreshScripts } = useFlowResources();
  
  const { handleCopy, handleCut, handlePaste } = useFlowClipboard(
    canvasNodes,
    selectedNodeIds,
    setCanvasNodes,
    setSelectedNodeIds,
    (ids) => ids.forEach(id => handleDeleteCanvasNode(id))
  );

  useFlowShortcuts({
    undo,
    redo,
    onSave: handleManualSave,
    onCopy: handleCopy,
    onCut: handleCut,
    onPaste: handlePaste,
    onDelete: () => {
      selectedNodeIds.forEach(id => handleDeleteCanvasNode(id));
      setSelectedNodeIds(new Set());
    },
    onCancelConnection: cancelConnection,
    onClearSelection: clearSelection,
    isConnecting: connectionState.isConnecting,
    hasSelection: selectedNodeIds.size > 0
  });

  // ==================== 12. UI 状态 (Modals) ====================
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PythonScriptConfig | null>(null);
  const [modelConfigOpen, setModelConfigOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LocalModelConfig | null>(null);

  const {
    floatingChatOpen,
    setFloatingChatOpen,
    floatingChatModel,
    setFloatingChatModel,
    floatingChatPosition,
    setFloatingChatPosition,
    floatingChatNodeId,
    setFloatingChatNodeId,
    openFloatingChatAt,
    openFloatingChatCentered
  } = useFlowFloatingChat(models, selectedModelId);

  const handleScriptSaved = () => refreshScripts();
  const handleSaveModel = async (config: LocalModelConfig) => {
    try {
      const response = await window.electronAPI?.modelSave?.(config);
      if (response?.success) {
        setModels((prev) => prev.map((m: LocalModelConfig) => m.id === config.id ? config : m));
        setModelConfigOpen(false);
      }
    } catch (error) {
      console.error('保存模型配置失败:', error);
    }
  };

  const handleRunClick = useCallback(() => {
    if (flowStatus === 'running') pauseFlow();
    else runFlow();
  }, [flowStatus, pauseFlow, runFlow]);

  // ==================== 返回聚合 Props ====================
  return {
    // Refs
    canvasRef,
    
    // Header Props
    headerProps: {
      flowName,
      flowId,
      categories,
      selectedCategory,
      flowsInCategory,
      flowStatus,
      onCreateCategory: handleCreateCategory,
      onDeleteCategory: handleDeleteCategory,
      onSwitchCategory: handleSwitchCategory,
      onRenameCategory: handleRenameCategory,
      onCreateFlow: handleCreateFlow,
      onDeleteFlow: handleDeleteFlow,
      onSwitchFlow: handleSwitchFlow,
      onRenameFlow: handleRenameFlow,
      onExportFlow: handleExportFlow,
      onImportFlow: handleImportFlow,
      onSaveFlow: handleManualSave,
      onRun: handleRunClick,
      onStop: stopFlow,
      models,
      selectedModelId,
      onModelSelect: setSelectedModelId,
      allowReadFlow,
      onToggleReadFlow: setAllowReadFlow,
      allowAiEdit,
      onToggleAiEdit: setAllowAiEdit,
      allowAiAutoExecution,
      onToggleAiAutoExecution: setAllowAiAutoExecution,
      theme: currentTheme,
      onSwitchTheme: handleSwitchTheme
    },

    // Toolbar Props
    toolbarProps: {
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
      zoom,
      animationSpeed,
      connectionStrokeWidth,
      onUndo: undo,
      onRedo: redo,
      onZoomIn: handleZoomIn,
      onZoomOut: handleZoomOut,
      onResetView: handleResetView,
      onOpenChat: openFloatingChatCentered,
      onSpeedChange: setAnimationSpeed,
      onConnectionStrokeWidthChange: setConnectionStrokeWidth,
      models,
      scripts,
      scriptComponents,
      isRefreshing,
      onRefreshScripts: refreshScripts,
      onAddScript: () => { setEditingConfig(null); setConfigModalOpen(true); },
      onOpenScriptManager: () => setManagerOpen(true),
      onEditScript: (script: PythonScriptConfig) => { setEditingConfig(script); setConfigModalOpen(true); },
      onDeleteScript: (id: string) => { if(confirm('删除脚本?')) pythonRegistry.deleteScriptConfig(id).then(refreshScripts); },
      onDeleteComponent: () => {},
      onModelConfig: (model: LocalModelConfig) => { setSelectedModel(model); setModelConfigOpen(true); },
      onAddModelNode: (model: LocalModelConfig) => {
        const newNode = createAIChatNode({ x: 0, y: 0 }, model);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            newNode.position = { x: (rect.width/2 - NODE_WIDTH/2 - pan.x)/zoom, y: (rect.height/2 - NODE_HEIGHT/2 - pan.y)/zoom };
        }
        setCanvasNodes(prev => [...prev, newNode]);
      },
      onAddPythonNode: (comp: any) => {
         const newNode = createPythonNode({ x: 0, y: 0 }, comp);
         const rect = canvasRef.current?.getBoundingClientRect();
         if (rect) {
             newNode.position = { x: (rect.width/2 - NODE_WIDTH/2 - pan.x)/zoom, y: (rect.height/2 - NODE_HEIGHT/2 - pan.y)/zoom };
         }
         setCanvasNodes(prev => [...prev, newNode]);
      },
      onDragStart: handleDragStart,
      theme: currentTheme
    },

    // Canvas Props
    canvasProps: {
      pan,
      zoom,
      currentTheme,
      showGrid,
      isSelecting,
      selectionBox,
      displayNodes,
      displayEdges,
      nodeSizes,
      animatingEdges,
      pendingChangeState,
      connectionStrokeWidth,
      animationSpeed,
      connectionState,
      selectedNodeIds,
      models,
      
      // Handlers
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onDragEnd: handleDragEnd,
      onMouseMove: handleCanvasMouseMove,
      onMouseUp: handleCanvasMouseUp,
      onMouseLeave: handleCanvasMouseUp,
      onMouseDown: handleCanvasMouseDown,
      onEdgeClick: (edge: FlowEdge) => setEdgeToDelete(edge),
      onNodeSelect: toggleNodeSelection,
      onNodeDelete: handleDeleteCanvasNode,
      onStartConnection: handleStartConnection,
      onCompleteConnection: handleCompleteConnection,
      onNodeSave: handleSaveNode,
      onNodeUpdate: handleNodeDataChange,
      onNodeDragStart: startNodeDrag,
      onNodeResize: handleNodeResize,
      onTogglePythonMode: handleTogglePythonMode,
      onToggleMemory: handleToggleMemory,
      onClearHistory: handleClearHistory,
      onUserInputSend: handleUserInputSend,
      onSwitchSend: handleSwitchSend,
      onTrigger: handleTrigger,
      onSimpleTrigger: handleSimpleTrigger,
      
      onDoubleClickCapture: (e: React.MouseEvent) => {
        if (connectionState.isConnecting) return;
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-flow-node]')) return;
        if (target?.closest('[data-canvas-toolbar]')) return;
        openFloatingChatAt(e.clientX - 190, e.clientY - 260);
      }
    },

    // Pending Changes Props
    pendingChangesProps: {
      pendingChanges,
      onAccept: handleKeepChange,
      onReject: handleRevertChange,
      onAcceptAll: handleKeepAll,
      onRejectAll: handleRevertAll
    },

    // Floating Chat Props
    floatingChatProps: {
      shouldShow: !!(floatingChatModel || chatMode === 'flow'),
      isOpen: floatingChatOpen,
      model: floatingChatModel || undefined,
      position: floatingChatPosition,
      onClose: () => setFloatingChatOpen(false),
      initialMessages: floatingChatNodeId ? canvasNodes.find(n => n.id === floatingChatNodeId)?.data?.messages : [],
      flowAppendixMd: !floatingChatNodeId ? flowAppendixMd : undefined,
      flowStructureMd: !floatingChatNodeId ? flowStructureMd : undefined,
      editInstructionsMd: !floatingChatNodeId ? editInstructionsMd : undefined,
      currentFlowId: !floatingChatNodeId ? (flowId ?? undefined) : undefined,
      onUpdateMessages: (newMessages: any[]) => {
         if (floatingChatNodeId) {
           setCanvasNodes(prev => prev.map(n => n.id === floatingChatNodeId ? { ...n, data: { ...n.data, messages: newMessages } } : n));
         }
      },
      onResponse: (content: string) => {
         if (floatingChatNodeId) {
           triggerDataTransfer(floatingChatNodeId, content);
         } else {
           handleAiResponse(content);
         }
      }
    },

    // Shortcut Help Props
    shortcutHelpProps: {
      nodeCount: canvasNodes.length,
      edgeCount: canvasEdges.length,
      connectionVisible: connectionState.isConnecting,
      theme: currentTheme
    },

    // Modal States & Handlers
    modals: {
      configModalOpen,
      setConfigModalOpen,
      managerOpen,
      setManagerOpen,
      editingConfig,
      setEditingConfig,
      modelConfigOpen,
      setModelConfigOpen,
      selectedModel,
      setSelectedModel,
      edgeToDelete,
      setEdgeToDelete,
      handleDeleteEdge,
      handleScriptSaved,
      handleSaveModel
    },

    // Status
    saveStatus
  };
}
