/**
 * HeySure AI - 节点操作 Hook
 * 处理流程节点的各种操作：
 * - Python 节点模式切换
 * - 节点数据更新
 * - 节点配置修改
 */
import { useCallback } from 'react';
import type { FlowNode } from '@/types/flow';

export function useNodeOperations(
  setCanvasNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
) {
  const handleTogglePythonMode = useCallback((nodeId: string) => {
    setCanvasNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        const isUnified = !n.data?.unifiedInput;
        
        let componentInputs = n.data?.componentInputs;

        // Rebuild componentInputs if missing or empty
        if (!componentInputs || (Array.isArray(componentInputs) && componentInputs.length === 0)) {
          const existingInputs = n.inputs || [];
          if (existingInputs.length > 0 && existingInputs[0].id !== 'jsonInput') {
            // Rebuild from existing ports (preserve custom ports)
            componentInputs = existingInputs.map((input: any, idx: number) => ({
              id: input.id || `input${idx}`,
              name: input.label?.toLowerCase() || `param${idx}`,
              label: input.label || `参数${idx}`,
              dataType: input.dataType || 'string',
              required: true,
              defaultValue: undefined
            }));
          } else if (existingInputs.length > 0 && existingInputs[0].id === 'jsonInput') {
            // If currently unified and has custom input, create a generic componentInputs
            componentInputs = [{ id: 'input', name: 'data', label: '数据', dataType: 'any', required: true }];
          }
        }

        // Ensure componentInputs is an array
        if (!componentInputs || !Array.isArray(componentInputs)) {
          componentInputs = [{ id: 'input', name: 'data', label: '输入', dataType: 'any', required: true }];
        }

        // Update input ports based on mode
        const newInputs = isUnified
          ? [{ id: 'jsonInput', type: 'input' as const, label: 'JSON数据', dataType: 'object' }]
          : componentInputs.length > 0
            ? componentInputs.map((input: any, idx: number) => ({
                id: input.id || `input${idx}`,
                type: 'input' as const,
                label: input.label || input.name,
                dataType: input.dataType || 'string'
              }))
            : [{ id: 'input', type: 'input' as const, label: '输入', dataType: 'any' }];

        return {
          ...n,
          data: { ...n.data, unifiedInput: isUnified, componentInputs },
          inputs: newInputs
        };
      }
      return n;
    }));
  }, [setCanvasNodes]);

  return {
    handleTogglePythonMode
  };
}
