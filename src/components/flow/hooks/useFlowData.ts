/**
 * HeySure AI - 流程数据管理 Hook
 * 处理流程编辑器中的数据操作：
 * - 流程加载和保存
 * - 流程分类管理
 * - 流程视图状态管理
 * - 流程导入/导出
 * - 流程复制和删除
 */
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { flowStorage, type FlowCategory } from '../flow-storage';
import type { FlowDefinition, FlowNode, FlowEdge, FlowViewState } from '@/types/flow';
import { normalizeNodes } from '../core/normalize';
import { presetThemes, getDefaultTheme } from '@/styles/theme';
import type { ThemeConfig } from '@/types/theme';

interface UseFlowDataProps {
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  setHistory: (history: any[]) => void;
  setHistoryIndex: (index: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setAnimationSpeed: (speed: number) => void;
  setShowGrid: (show: boolean) => void;
  setConnectionStrokeWidth: (width: number) => void;
  zoom: number;
  pan: { x: number; y: number };
  animationSpeed: number;
  showGrid: boolean;
  connectionStrokeWidth: number;
}

export function useFlowData({
  setNodes,
  setEdges,
  setHistory,
  setHistoryIndex,
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
}: UseFlowDataProps) {
  const { toast } = useToast();
  
  const [flowId, setFlowId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('新流程');
  
  const [categories, setCategories] = useState<FlowCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FlowCategory | null>(null);
  const [flowsInCategory, setFlowsInCategory] = useState<FlowDefinition[]>([]);
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(getDefaultTheme());

  // 刷新分类和流程数据
  const refreshFlowData = useCallback(() => {
    setCategories(flowStorage.getCategories());
    setSelectedCategory(flowStorage.getSelectedCategory());
    setFlowsInCategory(flowStorage.getFlowsInCategory());
  }, []);

  // 保存当前视图状态
  const saveCurrentViewState = useCallback(async () => {
    if (flowId) {
      await flowStorage.saveViewState(flowId, {
        zoom,
        pan,
        animationSpeed,
        showGrid,
        connectionStrokeWidth,
      });
    }
  }, [flowId, zoom, pan, animationSpeed, showGrid, connectionStrokeWidth]);

  const applyViewState = useCallback((viewState?: FlowViewState | null) => {
    if (viewState) {
      setZoom(viewState.zoom);
      setPan(viewState.pan);
      setAnimationSpeed(viewState.animationSpeed);
      setShowGrid(viewState.showGrid);
      setConnectionStrokeWidth(viewState.connectionStrokeWidth ?? 2);
      return;
    }
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setAnimationSpeed(1.5);
    setShowGrid(true);
    setConnectionStrokeWidth(2);
  }, [setZoom, setPan, setAnimationSpeed, setShowGrid, setConnectionStrokeWidth]);

  const applyFlowState = useCallback((flow: FlowDefinition | null) => {
    if (!flow) return;
    setFlowId(flow.id);
    setFlowName(flow.name);
    setNodes(normalizeNodes(flow.nodes || []));
    setEdges(flow.edges || []);
    setCurrentTheme(flow.theme ? flow.theme : getDefaultTheme());
    applyViewState(flowStorage.getViewState(flow.id));
    setHistory([]);
    setHistoryIndex(-1);
  }, [applyViewState, setEdges, setFlowId, setFlowName, setHistory, setHistoryIndex, setNodes, setCurrentTheme]);

  // 初始化加载
  useEffect(() => {
    const initFlowStorage = async () => {
      await flowStorage.init();
      refreshFlowData();
      
      const currentFlow = flowStorage.getCurrentFlow();
      applyFlowState(currentFlow);
    };
    initFlowStorage();

    const unsubscribe = flowStorage.onFlowSwitch((flowId) => {
      console.log('Detected flow switch:', flowId);
      refreshFlowData();
      const flow = flowStorage.getFlow(flowId).then(flow => {
        applyFlowState(flow);
      });
    });

    return () => {
      unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 自动保存视图状态
  useEffect(() => {
    if (!flowId) return;
    const timer = setTimeout(() => {
      flowStorage.saveViewState(flowId, {
        zoom,
        pan,
        animationSpeed,
        showGrid,
        connectionStrokeWidth,
      }).catch(err => console.error('保存视图状态失败:', err));
    }, 500);
    return () => clearTimeout(timer);
  }, [flowId, zoom, pan, animationSpeed, showGrid, connectionStrokeWidth]);

  // ==================== 分类操作 ====================
  
  const handleCreateCategory = async (name: string) => {
    if (!name.trim()) return;
    try {
      await flowStorage.addCategory(name.trim());
      refreshFlowData();
    } catch (error) {
      console.error('创建分类失败:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (categories.length <= 1) {
      alert('至少保留一个分类');
      return;
    }
    if (confirm('确定要删除此分类吗？分类下的所有流程也将被删除。')) {
      try {
        await flowStorage.deleteCategory(categoryId);
        refreshFlowData();
      } catch (error) {
        console.error('删除分类失败:', error);
      }
    }
  };

  const handleSwitchCategory = async (categoryId: string) => {
    try {
      await saveCurrentViewState();
      await flowStorage.selectCategory(categoryId);
      refreshFlowData();
      
      applyFlowState(flowStorage.getCurrentFlow());
    } catch (error) {
      console.error('切换分类失败:', error);
    }
  };

  const handleRenameCategory = async (categoryId: string, name: string) => {
    if (!name.trim()) return;
    try {
      await flowStorage.renameCategory(categoryId, name.trim());
      refreshFlowData();
    } catch (error) {
      console.error('重命名分类失败:', error);
    }
  };

  // ==================== 流程操作 ====================

  const handleCreateFlow = async (name?: string) => {
    try {
      await saveCurrentViewState();
      const newFlow = await flowStorage.createNewFlow(name || '新流程');
      setFlowId(newFlow.id);
      setFlowName(newFlow.name);
      setNodes([]);
      setEdges([]);
      
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setAnimationSpeed(1.5);
      setShowGrid(true);
      setConnectionStrokeWidth(2);
      
      setHistory([]);
      setHistoryIndex(-1);
      refreshFlowData();
    } catch (error) {
      console.error('创建流程失败:', error);
    }
  };

  const handleDeleteFlow = async (id?: string) => {
    if (flowsInCategory.length <= 1) {
      alert('至少保留一个流程');
      return;
    }
    if (confirm('确定要删除此流程吗？')) {
      try {
        await saveCurrentViewState();
        if (id) {
          await flowStorage.deleteFlow(id);
        } else {
          await flowStorage.deleteCurrentFlow();
        }
        refreshFlowData();
        
        applyFlowState(flowStorage.getCurrentFlow());
      } catch (error) {
        console.error('删除流程失败:', error);
      }
    }
  };

  const handleSwitchFlow = async (targetFlowId: string) => {
    try {
      await saveCurrentViewState();
      await flowStorage.switchFlow(targetFlowId);
      
      applyFlowState(flowStorage.getCurrentFlow());
    } catch (error) {
      console.error('切换流程失败:', error);
    }
  };

  const handleRenameFlow = async (id: string, name: string) => {
    if (!name.trim()) return;
    try {
      await flowStorage.renameFlow(id, name);
      if (id === flowId) {
        setFlowName(name);
      }
      refreshFlowData();
    } catch (error) {
      console.error('重命名流程失败:', error);
    }
  };

  const getAllFlowList = useCallback(() => {
    return (flowStorage as any).getAllFlows().map((f: any) => ({ id: f.id, name: f.name }));
  }, []);

  const handleSaveFlow = async (nodes: FlowNode[], edges: FlowEdge[], silent: boolean = false) => {
    if (!flowId) {
      if (!silent) {
        toast({
          title: "保存失败",
          description: "当前没有选中的流程",
          variant: "destructive"
        });
      }
      return;
    }
    try {
      const currentFlow = flowStorage.getCurrentFlow();
      if (currentFlow) {
        const normalizedNodes = normalizeNodes(nodes);
        await flowStorage.saveFlow({
          ...currentFlow,
          nodes: normalizedNodes,
          edges: edges,
          name: flowName,
        });
        console.log('流程已保存');
        if (!silent) {
          toast({
            title: "保存成功",
            description: "流程已成功保存到本地",
          });
        }
      }
    } catch (error) {
      console.error('保存流程失败:', error);
      if (!silent) {
        toast({
          title: "保存失败",
          description: String(error),
          variant: "destructive"
        });
      }
    }
  };

  const handleExportFlow = () => {
    if (!flowId) return;
    const data = flowStorage.exportFlow(flowId);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flowName || 'flow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFlow = async (file: File) => {
    try {
      const text = await file.text();
      await flowStorage.importFlow(text);
      refreshFlowData();
      
      applyFlowState(flowStorage.getCurrentFlow());
    } catch (error) {
      console.error('导入流程失败:', error);
    }
  };

  const handleSwitchTheme = useCallback(async (themeId: string) => {
    if (!flowId) return;
    const theme = Object.values(presetThemes).find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      await flowStorage.updateTheme(flowId, theme);
    }
  }, [flowId]);

  return {
    flowId,
    flowName,
    categories,
    currentTheme,
    handleSwitchTheme,
    selectedCategory,
    flowsInCategory,
    handleCreateCategory,
    handleDeleteCategory,
    handleSwitchCategory,
    handleRenameCategory,
    handleCreateFlow,
    handleDeleteFlow,
    handleSwitchFlow,
    handleRenameFlow,
    handleSaveFlow,
    handleExportFlow,
    handleImportFlow,
    refreshFlowData,
    getAllFlowList
  };
}
