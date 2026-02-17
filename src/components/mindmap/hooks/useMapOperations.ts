import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { mindmapStorage } from '../services/mindmap-storage';
import { layoutEngine, LayoutType } from '../services/layout-engine';
import type { ThemeConfig } from '@/types/theme';

interface UseMapOperationsProps {
  setNodes: any;
  setNodeIndex: any;
  setCurrentTheme: (theme: ThemeConfig) => void;
  setLayoutType: (type: LayoutType) => void;
  setMapName: (name: string) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setScale: (scale: number) => void;
  layoutRefreshRef: React.MutableRefObject<number>;
  mapName: string;
  setShowLayoutDropdown: (show: boolean) => void;
  setShowThemeDropdown: (show: boolean) => void;
}

export const useMapOperations = ({
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
}: UseMapOperationsProps) => {
  const { toast } = useToast();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const refreshMap = useCallback(() => {
    const updatedMap = mindmapStorage.getCurrentMap();
    setNodes(updatedMap?.nodes ? [...updatedMap.nodes] : []);
    setNodeIndex({ ...mindmapStorage.getNodeIndex() });
    
    if (updatedMap) {
      setMapName(updatedMap.name);
    }
    
    setCanUndo(mindmapStorage.canUndo());
    setCanRedo(mindmapStorage.canRedo());
    
    return updatedMap;
  }, [setNodes, setNodeIndex, setMapName]);

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 }); 
  }, [setScale, setPan]);

  const handleUndo = useCallback(async () => {
    await mindmapStorage.undo();
    const updatedMap = refreshMap();
    if (updatedMap?.theme) setCurrentTheme(updatedMap.theme);
    layoutRefreshRef.current++;
  }, [refreshMap, setCurrentTheme, layoutRefreshRef]);

  const handleRedo = useCallback(async () => {
    await mindmapStorage.redo();
    const updatedMap = refreshMap();
    if (updatedMap?.theme) setCurrentTheme(updatedMap.theme);
    layoutRefreshRef.current++;
  }, [refreshMap, setCurrentTheme, layoutRefreshRef]);

  const handleExport = useCallback(() => {
    const data = mindmapStorage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapName || 'mindmap'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '导出成功' });
  }, [mapName, toast]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await mindmapStorage.importData(text);
      const mapData = refreshMap();
      if (mapData) {
        setMapName(mapData.name);
        if (mapData.theme) setCurrentTheme(mapData.theme);
        layoutRefreshRef.current++;
        if (mapData.viewState) {
          setScale(mapData.viewState.scale);
          setPan({ x: mapData.viewState.x, y: mapData.viewState.y });
        } else {
          resetView();
        }
      }
      toast({ title: '导入成功' });
    } catch (error) {
      console.error('Import failed:', error);
      toast({ title: '导入失败', variant: 'destructive' });
    }
    // Clear input value to allow re-importing same file
    event.target.value = '';
  }, [refreshMap, setCurrentTheme, setMapName, setScale, setPan, layoutRefreshRef, resetView, toast]);

  const handleRelayout = useCallback(async () => {
    try {
      await mindmapStorage.relayoutEntireMap();
      refreshMap();
      resetView();
      toast({ title: '已重新布局' });
    } catch (error) {
      toast({ title: '布局失败' });
    }
  }, [refreshMap, resetView, toast]);

  const handleSwitchLayout = useCallback(async (newLayoutType: LayoutType) => {
    try {
      await mindmapStorage.setLayoutType(newLayoutType);
      setLayoutType(newLayoutType);
      refreshMap();
      resetView();
      setShowLayoutDropdown(false);
      toast({ title: `已切换为${layoutEngine.getAvailableLayouts().find(l => l.type === newLayoutType)?.name || newLayoutType}布局` });
    } catch (error) {
      toast({ title: '切换布局失败' });
    }
  }, [setLayoutType, refreshMap, resetView, setShowLayoutDropdown, toast]);

  const handleSwitchTheme = useCallback(async (themeId: string) => {
    try {
      await mindmapStorage.updateTheme(themeId);
      const mapData = refreshMap();
      if (mapData?.theme) {
        setCurrentTheme(mapData.theme);
      }
      setShowThemeDropdown(false);
      toast({ title: '已切换主题' });
    } catch (error) {
      toast({ title: '切换主题失败' });
    }
  }, [refreshMap, setCurrentTheme, setShowThemeDropdown, toast]);

  const handleSave = useCallback(async () => {
    try {
      await mindmapStorage.saveCurrentData();
      toast({ title: '保存成功' });
    } catch (error) {
      console.error('Save failed:', error);
      toast({ title: '保存失败', variant: 'destructive' });
    }
  }, [toast]);

  return {
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    handleExport,
    handleImport,
    handleRelayout,
    handleSwitchLayout,
    handleSwitchTheme,
    handleSave,
    resetView,
    refreshMap
  };
};
