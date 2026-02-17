/**
 * HeySure AI - 思维导图分类 Hook
 * 管理思维导图的分类：
 * - 分类列表加载
 * - 分类选择
 * - 分类下的思维导图列表
 * - 分类创建和管理
 */
import { useState, useCallback } from 'react';
import { FileCategory, MindmapData } from '../types';
import { mindmapStorage } from '../services/mindmap-storage';
import { useToast } from '@/hooks/use-toast';

interface UseMindmapCategoryProps {
  refreshMap: () => void;
  setMapId: (id: string) => void;
  mapId: string;
}

export const useMindmapCategory = ({
  refreshMap,
  setMapId,
  mapId
}: UseMindmapCategoryProps) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<FileCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | null>(null);
  const [mapsInCategory, setMapsInCategory] = useState<MindmapData[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showMapDropdown, setShowMapDropdown] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newMapName, setNewMapName] = useState('');
  
  // List map editing state
  const [editingListMapId, setEditingListMapId] = useState<string | null>(null);
  const [editingListMapName, setEditingListMapName] = useState('');

  const refreshCategoryData = useCallback(() => {
    setCategories(mindmapStorage.getCategories());
    setSelectedCategory(mindmapStorage.getSelectedCategory());
    setMapsInCategory(mindmapStorage.getMapsInCategory());
  }, []);

  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      toast({ title: '请输入分类名称', variant: 'destructive' });
      return;
    }
    try {
      await mindmapStorage.addCategory(newCategoryName);
      setNewCategoryName('');
      refreshCategoryData();
      toast({ title: '分类创建成功' });
    } catch (error) {
      toast({ title: '创建失败', description: '分类名可能已存在', variant: 'destructive' });
    }
  }, [newCategoryName, refreshCategoryData, toast]);

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    if (!window.confirm('确定要删除该分类及其下的所有思维导图吗？')) return;
    try {
      await mindmapStorage.deleteCategory(categoryId);
      refreshCategoryData();
      // 如果删除的是当前分类，刷新整个地图状态
      const currentCategory = mindmapStorage.getSelectedCategory();
      if (currentCategory && currentCategory.id !== categoryId) {
        // Automatically switched to default or another category
        const maps = mindmapStorage.getMapsInCategory();
        if (maps.length > 0) {
            setMapId(maps[0].id);
            refreshMap();
        }
      } else {
        // Fallback to default behavior if needed
         const maps = mindmapStorage.getMapsInCategory();
         if (maps.length > 0) {
             setMapId(maps[0].id);
             refreshMap();
         }
      }
      toast({ title: '分类删除成功' });
    } catch (error) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  }, [refreshCategoryData, setMapId, refreshMap, toast]);

  const handleSwitchCategory = useCallback(async (categoryId: string) => {
    try {
      await mindmapStorage.selectCategory(categoryId);
      refreshCategoryData();
      const maps = mindmapStorage.getMapsInCategory();
      if (maps.length > 0) {
        await mindmapStorage.switchMap(maps[0].id);
        setMapId(maps[0].id);
        refreshMap();
      } else {
        // Create a default map for empty category
        const newMap = await mindmapStorage.createNewMap('未命名导图');
        setMapId(newMap.id);
        refreshMap();
        refreshCategoryData();
      }
    } catch (error) {
      console.error(error);
      toast({ title: '切换分类失败', variant: 'destructive' });
    }
  }, [refreshCategoryData, setMapId, refreshMap, toast]);

  const startEditCategory = useCallback((category: FileCategory) => {
    setIsEditingCategory(true);
    setEditingCategoryName(category.name);
    // Ensure we are selecting the category we are editing (optional, but good UX)
    if (selectedCategory?.id !== category.id) {
       mindmapStorage.selectCategory(category.id);
       refreshCategoryData();
    }
  }, [selectedCategory, refreshCategoryData]);

  const saveCategoryName = useCallback(async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
      setIsEditingCategory(false);
      return;
    }
    try {
      await mindmapStorage.renameCategory(categoryId, editingCategoryName);
      setIsEditingCategory(false);
      refreshCategoryData();
      toast({ title: '重命名成功' });
    } catch (error) {
      toast({ title: '重命名失败', variant: 'destructive' });
    }
  }, [editingCategoryName, refreshCategoryData, toast]);

  const handleCreateMap = useCallback(async () => {
    const name = newMapName.trim() || '新思维导图';
    try {
      const newMap = await mindmapStorage.createNewMap(name);
      setMapId(newMap.id);
      setNewMapName('');
      refreshMap();
      refreshCategoryData();
      toast({ title: '创建成功' });
    } catch (error) {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  }, [newMapName, setMapId, refreshMap, refreshCategoryData, toast]);

  const handleDeleteMapById = useCallback(async (targetMapId: string) => {
    if (mapsInCategory.length <= 1) {
      toast({ title: '无法删除', description: '每个分类至少保留一个思维导图', variant: 'destructive' });
      return;
    }
    if (!window.confirm('确定要删除此思维导图吗？')) return;
    
    try {
      // If deleting the current map, switch to another one first
      if (targetMapId === mapId) {
        const otherMap = mapsInCategory.find(m => m.id !== targetMapId);
        if (otherMap) {
          await mindmapStorage.switchMap(otherMap.id);
          setMapId(otherMap.id);
        }
      }
      
      await mindmapStorage.deleteMap(targetMapId);
      refreshMap();
      refreshCategoryData();
      toast({ title: '删除成功' });
    } catch (error) {
      console.error(error);
      toast({ title: '删除失败', variant: 'destructive' });
    }
  }, [mapsInCategory, mapId, setMapId, refreshMap, refreshCategoryData, toast]);

  const handleDeleteMap = useCallback(async () => {
    // Legacy support or delete current
    if (mapId) {
      await handleDeleteMapById(mapId);
    }
  }, [mapId, handleDeleteMapById]);

  const handleSwitchMap = useCallback(async (id: string) => {
    try {
      await mindmapStorage.switchMap(id);
      setMapId(id);
      refreshMap();
      setShowMapDropdown(false);
    } catch (error) {
      toast({ title: '切换失败', variant: 'destructive' });
    }
  }, [setMapId, refreshMap, toast]);

  const startEditListMap = useCallback((map: MindmapData) => {
    setEditingListMapId(map.id);
    setEditingListMapName(map.name);
  }, []);

  const handleSaveListMap = useCallback(async (id: string) => {
    if (!editingListMapName.trim()) {
      setEditingListMapId(null);
      return;
    }
    try {
      await mindmapStorage.renameMapById(id, editingListMapName);
      setEditingListMapId(null);
      refreshCategoryData();
      if (id === mapId) {
        refreshMap(); // Update current map name display
      }
      toast({ title: '重命名成功' });
    } catch (error) {
      toast({ title: '重命名失败', variant: 'destructive' });
    }
  }, [editingListMapName, refreshCategoryData, mapId, refreshMap, toast]);

  return {
    categories, setCategories,
    selectedCategory, setSelectedCategory,
    mapsInCategory, setMapsInCategory,
    showCategoryDropdown, setShowCategoryDropdown,
    showMapDropdown, setShowMapDropdown,
    editingCategoryName, setEditingCategoryName,
    isEditingCategory, setIsEditingCategory,
    newCategoryName, setNewCategoryName,
    refreshCategoryData,
    handleCreateCategory,
    handleDeleteCategory,
    handleSwitchCategory,
    startEditCategory,
    saveCategoryName,
    handleCreateMap,
    handleDeleteMap,
    handleDeleteMapById,
    handleSwitchMap,
    startEditListMap,
    handleSaveListMap,
    editingListMapId, setEditingListMapId,
    editingListMapName, setEditingListMapName,
    newMapName, setNewMapName
  };
};
