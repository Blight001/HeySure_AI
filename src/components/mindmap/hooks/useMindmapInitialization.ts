import { useEffect } from 'react';
import { MindmapNode } from '../types';
import type { ThemeConfig } from '@/types/theme';
import { calculatePanToCenterNodes } from '../utils/view-utils';
import { mindmapStorage } from '../services/mindmap-storage';

interface UseMindmapInitializationProps {
  nodes: MindmapNode[];
  setPan: (pan: { x: number; y: number }) => void;
  setScale: (scale: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  hasInitializedView: React.MutableRefObject<boolean>;
  setMapId: (id: string) => void;
  setMapName: (name: string) => void;
  setCurrentTheme: (theme: ThemeConfig) => void;
  setSelectedModelId: (id: string) => void;
  setAllowReadMindmap: (allow: boolean) => void;
  setAllowAiEdit: (allow: boolean) => void;
  refreshCategoryData: () => void;
  refreshMap: () => void;
}

export const useMindmapInitialization = ({
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
  refreshCategoryData,
  refreshMap
}: UseMindmapInitializationProps) => {

  // Initial load
  useEffect(() => {
    const initMindmap = async () => {
      await mindmapStorage.init();
      refreshCategoryData();
      
      const mapData = mindmapStorage.getCurrentMap();
      if (mapData) {
        refreshMap();
        
        if (mapData.theme) setCurrentTheme(mapData.theme);
        
        if (mapData.aiConfig) {
          if (mapData.aiConfig.selectedModelId) setSelectedModelId(mapData.aiConfig.selectedModelId);
          setAllowReadMindmap(mapData.aiConfig.allowReadMindmap);
          setAllowAiEdit(mapData.aiConfig.allowAiEdit);
        }

        if (mapData.viewState) {
          setScale(mapData.viewState.scale);
          setPan({ x: mapData.viewState.x, y: mapData.viewState.y });
          hasInitializedView.current = true;
        } else if (mapData.nodes.length > 0 && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          if (containerRect.width > 0 && containerRect.height > 0) {
             const newPan = calculatePanToCenterNodes(
               mapData.nodes,
               containerRect.width,
               containerRect.height
             );
            setPan(newPan);
            hasInitializedView.current = true;
          }
        }
        
        setMapId(mapData.id);
      }
    };
    initMindmap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ResizeObserver for initial centering if needed
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      if (hasInitializedView.current) return;
      
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0 && nodes.length > 0) {
          const newPan = calculatePanToCenterNodes(
             nodes,
             entry.contentRect.width,
             entry.contentRect.height
           );
          
          setPan(newPan);
          hasInitializedView.current = true;
          observer.disconnect();
        }
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [nodes, setPan, hasInitializedView, containerRef]);
};
