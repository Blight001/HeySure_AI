/**
 * HeySure AI - 流程资源 Hook
 * 管理流程中使用的资源：
 * - Python 脚本加载
 * - 脚本组件管理
 * - 资源刷新功能
 * - 资源加载状态
 */
import { useState, useCallback, useEffect } from 'react';
import { pythonRegistry } from '../python/core/PythonRegistry';
import type { PythonScriptConfig, PythonComponent } from '@/types/flow';

export function useFlowResources() {
  const [scripts, setScripts] = useState<PythonScriptConfig[]>([]);
  const [scriptComponents, setScriptComponents] = useState<PythonComponent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshScripts = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const loadedScripts = await pythonRegistry.loadScriptConfigs();
      setScripts(loadedScripts);
      await pythonRegistry.refreshScriptComponents();
      setScriptComponents(pythonRegistry.getEnabled());
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  useEffect(() => {
    refreshScripts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    scripts,
    scriptComponents,
    isRefreshing,
    refreshScripts
  };
}
