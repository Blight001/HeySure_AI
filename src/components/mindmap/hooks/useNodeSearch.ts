/**
 * HeySure AI - 节点搜索 Hook
 * 用于跨思维导图搜索相同名称的节点：
 * - 节点搜索功能
 * - 搜索结果导航
 * - Ctrl+滚轮 快速切换跳转
 * - 搜索结果高亮
 */
/**
 * 节点搜索 Hook
 * 用于跨文件搜索相同名称的节点
 * 支持 Ctrl+滚轮 快速切换跳转
 */

import React, { useState, useCallback, useRef } from 'react';
import { mindmapStorage } from '../services/mindmap-storage';

export interface SearchResult {
  mapId: string;
  mapName: string;
  nodeId: string;
  nodeName: string;
  categoryName: string;
  duplicateIndex?: number;
}

export interface UseNodeSearchProps {
  currentMapId: string | null;
  onSwitchMap: (mapId: string, nodeId: string) => void;
}

export const useNodeSearch = ({ currentMapId, onSwitchMap }: UseNodeSearchProps) => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchMenu, setShowSearchMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  
  // 记录当前搜索的节点名称，用于滚轮切换
  const currentSearchNameRef = useRef<string>('');
  const resultsRef = useRef<SearchResult[]>([]);
  const currentIndexRef = useRef<number>(-1);

  // 搜索相同名称的节点
  const searchSimilarNodes = useCallback((e: React.MouseEvent | undefined, nodeName: string) => {
    console.log('[useNodeSearch] searchSimilarNodes called:', nodeName);
    if (!nodeName.trim()) {
      setSearchResults([]);
      resultsRef.current = [];
      setCurrentSearchIndex(-1);
      currentIndexRef.current = -1;
      return;
    }

    setIsSearching(true);
    currentSearchNameRef.current = nodeName;
    try {
      // 不再排除当前导图，允许在当前导图中搜索同名节点
      const results = mindmapStorage.searchNodesByName(nodeName);
      console.log('[useNodeSearch] Search results:', results);
      setSearchResults(results);
      resultsRef.current = results;
      const initialIndex = results.length > 0 ? 0 : -1;
      setCurrentSearchIndex(initialIndex);
      currentIndexRef.current = initialIndex;
    } catch (error) {
      console.error('[useNodeSearch] Search failed:', error);
      setSearchResults([]);
      resultsRef.current = [];
      setCurrentSearchIndex(-1);
      currentIndexRef.current = -1;
    } finally {
      setIsSearching(false);
    }
  }, [currentMapId]);

  // 处理滚轮搜索跳转
  const handleWheelSearch = useCallback((direction: 'up' | 'down', nodeId: string, nodeName: string): SearchResult | null => {
    let results = resultsRef.current;
    let index = currentIndexRef.current;

    // 如果名称改变或没有缓存结果，重新搜索
    if (currentSearchNameRef.current !== nodeName || results.length === 0) {
      console.log('[useNodeSearch] Initiating new search for wheel event:', nodeName);
      results = mindmapStorage.searchNodesByName(nodeName);
      resultsRef.current = results;
      setSearchResults(results);
      currentSearchNameRef.current = nodeName;
      
      // 找到当前节点的索引作为起始点
      const foundIndex = results.findIndex(r => r.nodeId === nodeId);
      index = foundIndex !== -1 ? foundIndex : 0;
      currentIndexRef.current = index;
      setCurrentSearchIndex(index);
    }

    if (results.length === 0) return null;

    // 计算下一个索引
    let newIndex;
    if (direction === 'down') {
      newIndex = (index + 1) % results.length;
    } else {
      newIndex = (index - 1 + results.length) % results.length;
    }

    console.log('[useNodeSearch] Wheel cycle:', { from: index, to: newIndex, total: results.length });
    
    currentIndexRef.current = newIndex;
    setCurrentSearchIndex(newIndex);
    return results[newIndex];
  }, []);

  // 滚轮切换到下一个/上一个结果 (保留用于兼容性，但建议使用 handleWheelSearch)
  const cycleToNextResult = useCallback((direction: 'up' | 'down'): SearchResult | null => {
    console.log('[useNodeSearch] cycleToNextResult:', { direction, resultCount: searchResults.length, currentIndex: currentSearchIndex });
    if (searchResults.length === 0) return null;

    let newIndex = currentSearchIndex;
    if (direction === 'down') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }

    console.log('[useNodeSearch] New index:', newIndex);
    setCurrentSearchIndex(newIndex);
    return searchResults[newIndex];
  }, [searchResults, currentSearchIndex]);

  // 获取当前索引对应的结果
  const getCurrentResult = useCallback((): SearchResult | null => {
    if (searchResults.length === 0 || currentSearchIndex < 0) return null;
    return searchResults[currentSearchIndex];
  }, [searchResults, currentSearchIndex]);

  // 获取搜索结果数量
  const getResultCount = useCallback((): number => {
    return searchResults.length;
  }, [searchResults]);

  // 获取当前索引
  const getCurrentIndex = useCallback((): number => {
    return currentSearchIndex;
  }, [currentSearchIndex]);

  // 清除搜索状态
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setCurrentSearchIndex(-1);
    currentSearchNameRef.current = '';
    setShowSearchMenu(false);
  }, []);

  // 隐藏搜索菜单
  const hideNodeSearchMenu = useCallback(() => {
    setShowSearchMenu(false);
  }, []);

  // 跳转到指定节点
  const navigateToNode = useCallback((result: SearchResult) => {
    hideNodeSearchMenu();
    onSwitchMap(result.mapId, result.nodeId);
  }, [hideNodeSearchMenu, onSwitchMap]);

  // 跳转到当前索引的节点（用于滚轮触发）
  const navigateToCurrentIndex = useCallback(() => {
    const result = getCurrentResult();
    if (result) {
      navigateToNode(result);
    }
  }, [getCurrentResult, navigateToNode]);

  return {
    searchResults,
    isSearching,
    showSearchMenu,
    menuPosition,
    currentSearchIndex,
    showNodeSearchMenu: searchSimilarNodes, // 重命名，保持兼容性
    hideNodeSearchMenu,
    navigateToNode,
    searchSimilarNodes,
    cycleToNextResult,
    getCurrentResult,
    getResultCount,
    getCurrentIndex,
    clearSearch,
    navigateToCurrentIndex,
    handleWheelSearch
  };
};
