/**
 * HeySure AI - 流程执行 Hook
 * 处理流程的运行和执行：
 * - 流程启动和停止
 * - 节点执行状态管理
 * - 节点执行顺序调度
 * - 执行动画效果
 * - 执行结果传递
 * - 触发器控制
 */
import { useCallback, useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import type { FlowNode, FlowEdge } from '@/types/flow';
import { mindmapStorage } from '@/components/mindmap/services/mindmap-storage';
import { mindmapToMarkdown } from '@/components/mindmap/utils/mindmap-to-markdown';

interface UseFlowExecutionProps {
  nodes: FlowNode[];
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
  edges: FlowEdge[];
  animationSpeed: number;
  setAnimatingEdges: React.Dispatch<React.SetStateAction<Set<string>>>;
  saveToHistory: () => void;
}

export function useFlowExecution({
  nodes,
  setNodes,
  edges,
  animationSpeed,
  setAnimatingEdges,
  saveToHistory
}: UseFlowExecutionProps) {
  const { toast } = useToast();
  
  // 流程执行状态
  const [flowStatus, setFlowStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const flowStatusRef = useRef<'idle' | 'running' | 'paused'>('idle');
  const pendingTasksRef = useRef<Array<() => void>>([]);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppedRef = useRef(false);

  // 同步状态到 ref
  useEffect(() => {
    flowStatusRef.current = flowStatus;
  }, [flowStatus]);
  
  // 使用 ref 追踪最新的 nodes，解决闭包中的 stale state 问题
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // 使用 ref 追踪最新的 edges，确保在异步回调中能获取到最新的连线状态（如已被删除）
  const edgesRef = useRef(edges);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // 使用 ref 追踪最新的动画速度，支持实时变速
  const animationSpeedRef = useRef(animationSpeed);
  useEffect(() => {
    animationSpeedRef.current = animationSpeed;
  }, [animationSpeed]);

  // 智能延迟执行函数：支持实时速度调整和状态检查
  const executeWithDelay = useCallback((task: () => void, cleanup?: () => void, forceExecution: boolean = false) => {
    const startTime = Date.now();
    
    const check = () => {
      // 检查是否被显式停止（即使是强制执行也要停止）
      if (isStoppedRef.current) {
        cleanup?.();
        return;
      }

      // 1. 检查是否已停止 (强制执行除外)
      if (flowStatusRef.current === 'idle' && !forceExecution) {
        cleanup?.(); // 即使停止也要清理动画状态
        return;
      }

      // 2. 检查是否暂停
      if (flowStatusRef.current === 'paused') {
        requestAnimationFrame(check);
        return;
      }

      // 3. 检查时间是否满足当前速度设定
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= animationSpeedRef.current) {
        task();
      } else {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
  }, []);

  // 暂停流程
  const pauseFlow = useCallback(() => {
    setFlowStatus('paused');
  }, []);

  // 停止流程
  const stopFlow = useCallback(() => {
    setFlowStatus('idle');
    isStoppedRef.current = true;
    pendingTasksRef.current = [];
    setAnimatingEdges(new Set()); // 立即清除所有动画
    
    // 注意：不清除 resetTimerRef，确保 End 节点触发的 5秒自动重置 能够执行
  }, [setAnimatingEdges]);

  // 重置所有节点状态
  const resetNodesStatus = useCallback(() => {
    setNodes(prev => prev.map(n => ({
      ...n,
      data: {
        ...n.data,
        status: undefined, // 清除状态边框
        isTriggering: false,
        // 注意：不清除 value 或 messages，保留运行结果，仅重置视觉状态
      }
    })));
  }, [setNodes]);

  // 触发数据流转和动画
  const triggerDataTransfer = useCallback((sourceNodeId: string, payload: any, sourceType: 'input' | 'output' = 'output', isForced: boolean = false, sourceHandleId?: string) => {
    // 使用 nodesRef.current 获取最新节点数据
    const currentNodes = nodesRef.current;
    const sourceNode = currentNodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    const outgoingEdges = edges.filter(edge => {
      if (edge.source !== sourceNodeId) return false;
      if (sourceHandleId && edge.sourceHandle !== sourceHandleId) return false;

      if (sourceType === 'output') {
        // 只允许从输出端口流出 (Input-to-Input 级联由接收端触发)
        return sourceNode.outputs.some(o => o.id === edge.sourceHandle);
      } else {
        return sourceNode.inputs.some(i => i.id === edge.sourceHandle);
      }
    });

    if (outgoingEdges.length === 0) return;

    // 触发连线动画
    setAnimatingEdges(prev => {
      const next = new Set(prev);
      outgoingEdges.forEach(edge => next.add(edge.id));
      return next;
    });

    // 动态时长清除动画状态并更新数据
    // 使用 executeWithDelay 替代 setTimeout，支持实时变速和状态检查
    const cleanup = () => {
      setAnimatingEdges(prev => {
        const next = new Set(prev);
        outgoingEdges.forEach(edge => next.delete(edge.id));
        return next;
      });
    };

    executeWithDelay(() => {
      // 二次检查：确保节点和连线仍然存在（处理删除操作后的状态）
      const currentEdges = edgesRef.current;
      const currentNodes = nodesRef.current;

      // 验证源节点是否存在
      if (!currentNodes.find(n => n.id === sourceNodeId)) {
        cleanup();
        return;
      }

      // 过滤出仍然有效的连线
      const validEdges = outgoingEdges.filter(edge => 
        currentEdges.some(e => e.id === edge.id) &&
        currentNodes.some(n => n.id === edge.target)
      );

      if (validEdges.length === 0) {
        cleanup();
        return;
      }

      // 清除动画状态
      cleanup();

      // 1. 更新目标节点的数据
      setNodes(prev => {
        const nextNodes = [...prev];
        validEdges.forEach(edge => {
          const targetNodeIndex = nextNodes.findIndex(n => n.id === edge.target);
          if (targetNodeIndex !== -1) {
            const targetNode = nextNodes[targetNodeIndex];

            // 如果连接到目标节点的输出端口，则不更新节点数据（仅作为中继）
            const isTargetOutput = targetNode.outputs.some(o => o.id === edge.targetHandle);
            if (isTargetOutput) return;

            nextNodes[targetNodeIndex] = {
              ...targetNode,
              data: {
                ...targetNode.data,
                // UserInput 节点不应被上游数据覆盖输入内容
                ...(targetNode.type === 'userInput' ? {} : { value: payload }),
                status: 'idle' // 接收到数据后状态变更
              }
            };
          }
        });
        return nextNodes;
      });

      // 2. 触发目标节点的执行逻辑 和 转发逻辑
      const latestNodes = nodesRef.current;
      
      validEdges.forEach(edge => {
        const targetNode = latestNodes.find(n => n.id === edge.target);
        if (!targetNode) return;

        // 检查是否连接到输出端口（中继模式）
        const isTargetOutput = targetNode.outputs.some(o => o.id === edge.targetHandle);
        if (isTargetOutput) {
          triggerDataTransfer(targetNode.id, payload, 'output', isForced, edge.targetHandle);
          return;
        }

        // 检查是否为 Input-to-Input 中继
        const isTargetInput = targetNode.inputs.some(i => i.id === edge.targetHandle);
        if (isTargetInput) {
           const hasInputRelay = currentEdges.some(e => e.source === targetNode.id && e.sourceHandle === edge.targetHandle);
           if (hasInputRelay) {
              triggerDataTransfer(targetNode.id, payload, 'input', isForced, edge.targetHandle);
           }
        }

        if (targetNode.type === 'aiChat') {
          handleAINodeExecution(targetNode.id, payload, isForced);
        } else if (targetNode.type === 'python') {
          handlePythonExecution(targetNode.id, payload, isForced);
        } else if (targetNode.type === 'switch') {
          handleSwitchReceiveSignal(targetNode.id, payload, targetNode.data?.isOn ?? false, isForced);
        } else if (targetNode.type === 'classifier') {
          handleClassifierExecution(targetNode.id, payload, isForced);
        } else if (targetNode.type === 'textDisplay') {
          handleTextDisplayExecution(targetNode.id, payload, edge.target, isForced);
        } else if (targetNode.type === 'userInput') {
          handleUserInputSend(targetNode.id, undefined, isForced);
        } else if (targetNode.type === 'mindmapInfo') {
          handleMindmapInfoExecution(targetNode.id, payload, isForced);
        } else if (targetNode.type === 'end') {
          stopFlow();
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(() => {
            resetNodesStatus();
            resetTimerRef.current = null;
          }, 5000);
        } else {
          // 对于其他节点，让数据通过
          // 递归调用，利用 executeWithDelay 自动处理延迟
          executeWithDelay(() => {
            triggerDataTransfer(targetNode.id, payload, 'output', isForced);
          }, undefined, isForced);
        }
      });

    }, cleanup, isForced);
  }, [nodes, edges, animationSpeed, setAnimatingEdges, stopFlow, resetNodesStatus, executeWithDelay]);

  // 运行流程
  const runFlow = useCallback(() => {
    isStoppedRef.current = false;
    // 运行开始时，清除可能存在的重置定时器
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    if (flowStatusRef.current === 'paused') {
      // 从暂停恢复
      setFlowStatus('running');
      const tasks = pendingTasksRef.current;
      pendingTasksRef.current = [];
      tasks.forEach(task => task());
    } else {
      // 从头开始
      setFlowStatus('running');
      const startNodes = nodesRef.current.filter(n => n.type === 'start');
      
      if (startNodes.length === 0) {
        toast({
          title: '无法运行',
          description: '当前流程没有开始节点',
          variant: 'destructive'
        });
        return;
      }

      startNodes.forEach(node => {
        // 修改：Start 节点发送的消息格式与普通按钮一致
        triggerDataTransfer(node.id, { button: true }, 'output');
      });
    }
  }, [triggerDataTransfer, toast]);


  // 处理文本显示节点执行
  const handleTextDisplayExecution = useCallback((nodeId: string, payload: any, edgeTargetId: string, isForced: boolean = false) => {
     const isTriggerSignal = payload && typeof payload === 'object' && payload.button === true;
     const targetNode = nodes.find(n => n.id === nodeId);
     if (!targetNode) return;

     const currentContent = targetNode.data?.presetText || '';
     // 获取模式，默认为覆盖
     const inputMode = targetNode.data?.inputMode || 'overwrite'; 

     // 触发模式下，或者收到纯触发信号时，不更新显示内容
     if (inputMode === 'trigger' || isTriggerSignal) {
        if (inputMode === 'trigger') {
             console.log('[textDisplay] 触发模式: 不更新显示，仅触发');
        } else {
             console.log('[textDisplay] 收到触发器信号，不更新显示');
        }
        
        setNodes(prev => prev.map(n =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: 'completed' } }
            : n
        ));
        triggerDataTransfer(nodeId, currentContent, 'output', isForced);
        return;
     }

     // 正常数据处理 (Overwrite / Append)
     const stringPayload = String(payload ?? '');
     let newDisplayText = stringPayload;
     
     if (inputMode === 'append') {
        const currentDisplay = targetNode.data?.displayText || targetNode.data?.presetText || '';
        // 如果已有内容，且不为空，则换行追加
        newDisplayText = currentDisplay ? `${currentDisplay}\n${stringPayload}` : stringPayload;
     }
     
     console.log(`[textDisplay] ${inputMode === 'append' ? '追加' : '覆盖'}模式: 更新显示内容`);
     
     setNodes(prev => prev.map(n =>
       n.id === nodeId
         ? { ...n, data: { ...n.data, receivedData: stringPayload, displayText: newDisplayText, status: 'completed' } }
         : n
     ));
     triggerDataTransfer(nodeId, currentContent, 'output', isForced);
  }, [nodes, setNodes, triggerDataTransfer]);


  // 处理 AI 节点执行
  const handleAINodeExecution = useCallback(async (nodeId: string, input: string, isForced: boolean = false) => {
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: String(input),
      timestamp: Date.now()
    };

    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        const currentHistory = n.data?.messages || [];
        return {
          ...n,
          data: {
            ...n.data,
            status: 'running',
            messages: [...currentHistory, userMessage]
          }
        };
      }
      return n;
    }));

    try {
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (!node) throw new Error("节点未找到");

      const modelId = node.data?.modelId;
      const modelConfig = node.data?.model;
      const useMemory = node.data?.useMemory !== false;
      const systemPrompt = node.data?.systemPrompt;

      if (!modelId && !modelConfig) {
           throw new Error("AI模型未配置");
      }

      let messages: any[];
      if (useMemory) {
        const historyMessages = node.data?.messages || [];
        messages = [...historyMessages, { role: 'user', content: String(input) }];
      } else {
        messages = [{ role: 'user', content: String(input) }];
      }

      if (systemPrompt) {
        messages.unshift({ role: 'system', content: systemPrompt });
      }

      if (!window.electronAPI?.ai?.chat) {
        throw new Error("AI功能未初始化，请尝试按 Ctrl+R 刷新页面");
      }

      const response = await window.electronAPI.ai.chat({
          modelId,
          modelConfig,
          messages
      });

      if (!response.success) {
          throw new Error(response.error || "AI调用失败");
      }

      const output = response.data;
      const usage = response.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const currentTokens = promptTokens + completionTokens;

      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: output,
        timestamp: Date.now()
      };

      setNodes(prev => prev.map(n => {
        if (n.id === nodeId) {
          const prevTokenStats = n.data?.tokenStats || {
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            requestCount: 0
          };

          const newTokenStats = {
            currentTokens,
            totalTokens: prevTokenStats.totalTokens + currentTokens,
            promptTokens: prevTokenStats.promptTokens + promptTokens,
            completionTokens: prevTokenStats.completionTokens + completionTokens,
            requestCount: prevTokenStats.requestCount + 1
          };

          if (useMemory) {
            const currentHistory = n.data?.messages || [];
            return {
              ...n,
              data: {
                ...n.data,
                status: 'completed',
                value: output,
                usage: usage,
                tokenStats: newTokenStats,
                messages: [...currentHistory, assistantMessage]
              }
            };
          } else {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'completed',
                value: output,
                usage: usage,
                tokenStats: newTokenStats,
                messages: []
              }
            };
          }
        }
        return n;
      }));

      triggerDataTransfer(nodeId, output, 'output', isForced);

    } catch (error: any) {
      console.error("AI Execution Error:", error);
      toast({
          variant: "destructive",
          title: "AI执行失败",
          description: error.message
      });
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'error' } } : n));
    }
  }, [nodes, setNodes, triggerDataTransfer, toast]);

  const handleUserInputSend = useCallback((nodeId: string, value?: string, isForced: boolean = true) => {
    const node = nodes.find(n => n.id === nodeId);
    const inputValue = value !== undefined ? value : (node?.data?.value || '');
    const config = node?.data?.config;
    let payload = inputValue;

    if (config?.formatType === 'json' && config.jsonTemplate) {
      try {
        const escapedInput = JSON.stringify(inputValue).slice(1, -1);
        const jsonStr = config.jsonTemplate.replace(/{{input}}/g, escapedInput);
        JSON.parse(jsonStr); 
        payload = jsonStr;
      } catch (e) {
        toast({
          title: "发送失败",
          description: "JSON 格式生成错误，请检查模板配置",
          variant: "destructive"
        });
        return;
      }
    }

    setNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n
    ));

    toast({
      title: "发送成功",
      description: `已发送内容: ${payload}`,
    });

    // 用户手动输入视为强制触发，或者继承上游的强制状态
    setFlowStatus('running');
    isStoppedRef.current = false;
    triggerDataTransfer(nodeId, payload, 'output', isForced);
    
    executeWithDelay(() => {
        setNodes(prev => prev.map(n => 
            n.id === nodeId ? { ...n, data: { ...n.data, status: 'completed' } } : n
        ));
    }, undefined, true);
  }, [nodes, setNodes, triggerDataTransfer, animationSpeed, toast, executeWithDelay]);

  const handleToggleMemory = useCallback((nodeId: string, useMemory: boolean) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: { ...n.data, useMemory }
        };
      }
      return n;
    }));
    saveToHistory();
  }, [setNodes, saveToHistory]);

  const handleClearHistory = useCallback(async (nodeId: string) => {
    let updatedNode: FlowNode | null = null;
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        updatedNode = {
          ...n,
          data: {
            ...n.data,
            messages: [],
            value: undefined,
            usage: undefined,
            tokenStats: undefined,
            savedAt: new Date().toISOString()
          }
        };
        return updatedNode;
      }
      return n;
    }));

    if (updatedNode) {
      try {
        await window.electronAPI?.nodeSave?.(updatedNode);
      } catch (error) {
        console.error('[handleClearHistory] 保存节点数据失败:', error);
      }
    }
    saveToHistory();
  }, [setNodes, saveToHistory]);

  const handleSwitchSend = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const pendingSignal = node.data?.pendingSignal;
    const hasPendingSignal = node.data?.hasPendingSignal ?? pendingSignal !== undefined;

    if (!hasPendingSignal) {
      console.log('[handleSwitchSend] 没有待发送的信号');
      return;
    }

    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n
    ));

    const payload = pendingSignal;
    // 手动开启开关，视为强制触发
    setFlowStatus('running');
    isStoppedRef.current = false;
    triggerDataTransfer(nodeId, payload, 'output', true);

    executeWithDelay(() => {
      setNodes(prev => prev.map(n =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, status: 'completed', pendingSignal: undefined, hasPendingSignal: false } }
          : n
      ));
    }, undefined, true);

    toast({
      title: "信号已发送",
      description: "信号已转发到下游节点",
      duration: 2000
    });
  }, [nodes, setNodes, triggerDataTransfer, animationSpeed, toast, executeWithDelay]);

  const handleSwitchReceiveSignal = useCallback((nodeId: string, signal: any, isOn: boolean, isForced: boolean = false) => {
    if (isOn) {
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n
      ));
      triggerDataTransfer(nodeId, signal, 'output', isForced);
      executeWithDelay(() => {
        setNodes(prev => prev.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, status: 'completed' } } : n
        ));
      }, undefined, true);
    } else {
      setNodes(prev => prev.map(n => 
        n.id === nodeId 
        ? { ...n, data: { ...n.data, pendingSignal: signal, hasPendingSignal: true, lastSignalTime: new Date().toLocaleTimeString() } } 
        : n
      ));
    }
  }, [setNodes, triggerDataTransfer, animationSpeed, executeWithDelay]);

  const handleClassifierExecution = useCallback((nodeId: string, payload: any, isForced: boolean = false) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;

    // Determine output port
    let outputIndex = -1;
    const keywords = node.data?.keywords || [];
    const payloadStr = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
    
    // 1. Keyword matching (Priority)
    // Find the first keyword that is contained in the payload
    const keywordIndex = keywords.findIndex((keyword: string) => 
      keyword && keyword.trim() !== '' && payloadStr.includes(keyword)
    );

    if (keywordIndex !== -1) {
      outputIndex = keywordIndex;
      console.log(`[Classifier] Keyword match: "${keywords[keywordIndex]}" -> Output Index ${outputIndex}`);
    } else {
      // 2. Numeric index fallback
      let value = parseInt(String(payload), 10);
      
      // If payload is an object with 'button': true (trigger signal), treat as 1
      if (typeof payload === 'object' && payload.button === true) {
           value = 1;
      }

      if (!isNaN(value)) {
          // 1-based to 0-based
          outputIndex = value - 1;
      } else {
          // If not a number and no keyword match, warn and fallback to last output
          console.warn(`[Classifier] No keyword match and invalid numeric input: ${payload}, defaulting to last output.`);
          outputIndex = node.outputs.length - 1;
      }
    }

    if (outputIndex < 0) outputIndex = 0;
    
    if (outputIndex >= node.outputs.length) {
        // Fallback to the last port (Default/Else behavior)
        outputIndex = node.outputs.length - 1;
    }

    // Update node data with last value, status AND activeIndex
    setNodes(prev => prev.map(n => 
      n.id === nodeId 
        ? { ...n, data: { ...n.data, lastValue: typeof payload === 'object' ? JSON.stringify(payload) : payload, status: 'completed', activeIndex: outputIndex } } 
        : n
    ));

    const targetOutput = node.outputs[outputIndex];
    if (targetOutput) {
        console.log(`[Classifier] Input ${payload} -> Output ${targetOutput.label} (${targetOutput.id})`);
        triggerDataTransfer(nodeId, payload, 'output', isForced, targetOutput.id);
    } else {
        console.warn(`[Classifier] No output found for index ${outputIndex}`);
    }

  }, [triggerDataTransfer, setNodes]);

  const handleTrigger = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const triggerCount = node.data?.triggerCount || 0;
    const triggerTime = new Date().toLocaleTimeString();

    setNodes(prev => prev.map(n => 
      n.id === nodeId 
      ? { ...n, data: { ...n.data, triggerCount: triggerCount + 1, lastTriggerTime: triggerTime, isTriggering: true } }
      : n
    ));

    setFlowStatus('running');
    isStoppedRef.current = false;
    const payload = { button: true };
    triggerDataTransfer(nodeId, payload, 'output', true); // 手动触发强制执行

    setTimeout(() => {
      setNodes(prev => prev.map(n => 
        n.id === nodeId ? { ...n, data: { ...n.data, isTriggering: false } } : n
      ));
    }, 500);

    toast({
      title: '信号已触发',
      description: `${node.data?.label || '触发器'} 已发送 {"button":true}`,
      duration: 2000
    });
  }, [nodes, setNodes, triggerDataTransfer, toast]);

  const handleSimpleTrigger = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const triggerCount = node.data?.triggerCount || 0;

    setNodes(prev => prev.map(n => 
      n.id === nodeId 
      ? { ...n, data: { ...n.data, triggerCount: triggerCount + 1, lastTriggerTime: new Date().toLocaleTimeString() } }
      : n
    ));

    setFlowStatus('running');
    isStoppedRef.current = false;
    triggerDataTransfer(nodeId, { button: true }, 'output', true); // 手动触发强制执行
  }, [nodes, setNodes, triggerDataTransfer]);

  const generateFunctionInfo = (funcName: string, inputs?: any[], outputs?: any[]): string => {
    let info = `【函数信息】\n`;
    info += `函数: ${funcName}\n`;
    info += `参数:\n`;

    if (inputs && inputs.length > 0) {
      inputs.forEach((input, idx) => {
        const required = input.required ? '(必需)' : '(可选)';
        const defaultVal = input.defaultValue !== undefined ? `=${JSON.stringify(input.defaultValue)}` : '';
        const description = input.description ? String(input.description).trim() : '';
        info += `  ${idx + 1}.${description}${required}${defaultVal}\n`;
      });
    } else {
      info += `  (无参数)\n`;
    }

    const buildExampleValue = (type?: string) => {
      const normalized = String(type || 'any').toLowerCase();
      if (normalized.includes('int') || normalized.includes('float') || normalized.includes('number')) return 0;
      if (normalized.includes('bool')) return false;
      if (normalized.includes('list') || normalized.includes('array')) return [];
      if (normalized.includes('dict') || normalized.includes('object') || normalized.includes('map')) return {};
      if (normalized.includes('string') || normalized.includes('str')) return '';
      return null;
    };

    const examplePayload: Record<string, any> = {};
    if (inputs && inputs.length > 0) {
      inputs.forEach((input: any, index: number) => {
        const key = String(index);
        if (input.defaultValue !== undefined) {
          examplePayload[key] = input.defaultValue;
        } else {
          examplePayload[key] = buildExampleValue(input.dataType);
        }
      });
    }

    info += `示例:\n`;
    info += `${JSON.stringify(examplePayload, null, 2)}\n`;
    info += `仅发送 JSON`;
    return info;
  };

  const stripWrappedQuotes = (value: string) => {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    return value;
  };

  // 处理 Python 节点执行
  const handlePythonExecution = useCallback(async (nodeId: string, payload: any, isForced: boolean = false) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const { filePath, functionName, unifiedInput, componentInputs, label } = node.data;

    // 更新节点状态为运行中
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n
    ));

    try {
      let args: any[] = [];
      let shouldSkipExecution = false;
      let fallbackOutput = '';
      let inputsObj: Record<string, any> = {};

      if (unifiedInput) {
        // 统一输入模式：解析 JSON 数据
        let jsonData: Record<string, any>;

        // 尝试解析 JSON
        if (typeof payload === 'string') {
          try {
            jsonData = JSON.parse(payload);
          } catch {
            // 如果不是有效 JSON，尝试从文本中提取 JSON
            const jsonMatch = payload.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                jsonData = JSON.parse(jsonMatch[0]);
              } catch {
                // JSON 解析失败，生成函数信息文本
                console.log('[Python] JSON 解析失败，生成函数信息');
                const funcInfo = generateFunctionInfo(label || functionName, componentInputs, node.data?.componentOutputs);
                fallbackOutput = payload + '\n' + funcInfo;
                shouldSkipExecution = true;
              }
            } else {
              // 没有找到 JSON 格式，生成函数信息文本
              console.log('[Python] 未找到 JSON 格式，生成函数信息');
              const funcInfo = generateFunctionInfo(label || functionName, componentInputs, node.data?.componentOutputs);
              fallbackOutput = payload + '\n' + funcInfo;
              shouldSkipExecution = true;
            }
          }
        } else if (typeof payload === 'object') {
          jsonData = payload;
        } else {
          // 非字符串非对象，生成函数信息文本
          console.log('[Python] 数据格式不支持，生成函数信息');
          const funcInfo = generateFunctionInfo(label || functionName, componentInputs, node.data?.componentOutputs);
          fallbackOutput = String(payload) + '\n' + funcInfo;
          shouldSkipExecution = true;
        }

        // 如果需要跳过执行，使用 fallbackOutput
        if (shouldSkipExecution && fallbackOutput) {
          setNodes(prev => prev.map(n =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, status: 'completed', value: fallbackOutput } }
              : n
          ));
          triggerDataTransfer(nodeId, fallbackOutput, 'output', isForced);
          return;
        }

        const getJsonValue = (key: string, index: number) => {
          if (jsonData[key] !== undefined) return jsonData[key];
          const indexKey = String(index);
          if (jsonData[indexKey] !== undefined) return jsonData[indexKey];
          return undefined;
        };

        // 根据 componentInputs 定义映射参数
        args = componentInputs?.map((input: any, index: number) => {
          const rawValue = getJsonValue(input.name, index);
          if (rawValue !== undefined) {
            // 类型转换
            switch (input.dataType) {
              case 'number':
                return Number(rawValue);
              case 'boolean':
                return Boolean(rawValue);
              case 'array':
                return Array.isArray(rawValue) ? rawValue : [rawValue];
              default:
                return typeof rawValue === 'string' ? stripWrappedQuotes(rawValue) : rawValue;
            }
          } else if (input.defaultValue !== undefined) {
            return input.defaultValue;
          }
          return null;
        }) || [];

        // 将数组转换为对象格式
        componentInputs?.forEach((input: any, idx: number) => {
          const value = args[idx];
          inputsObj[input.name] = typeof value === 'string' ? stripWrappedQuotes(value) : value;
        });
      } else {
        // 多参数模式：payload 直接作为参数数组或单个值
        if (Array.isArray(payload)) {
          args = payload;
        } else {
          args = [payload];
        }

        // 多参数模式下，如果没有 componentInputs，创建一个默认的对象
        if (componentInputs && componentInputs.length > 0) {
          componentInputs.forEach((input: any, idx: number) => {
            const value = args[idx];
            inputsObj[input.name] = typeof value === 'string' ? stripWrappedQuotes(value) : value;
          });
        } else {
          const value = args[0];
          inputsObj['input'] = typeof value === 'string' ? stripWrappedQuotes(value) : value;
        }
      }

      // 调用 Python 组件
      if (!window.electronAPI?.pythonExecute) {
        throw new Error("Python 执行功能未初始化，请确保 Electron 主进程已启动");
      }

      const response = await window.electronAPI.pythonExecute({
        filePath,
        functionName,
        inputs: inputsObj,
        config: node.data?.componentConfig || { timeout: 30, requireApproval: false, allowedImports: [], blockedImports: [] }
      });

      if (!response.success) {
        throw new Error(response.error || 'Python 执行失败');
      }

      const output = response.output;

      // 更新节点状态为完成
      setNodes(prev => prev.map(n =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, status: 'completed', value: output, lastExecutionTime: new Date().toISOString() } }
          : n
      ));

      // 触发数据传递到下游
      triggerDataTransfer(nodeId, output, 'output', isForced);

    } catch (error: any) {
      console.error('Python Execution Error:', error);
      toast({
        variant: 'destructive',
        title: 'Python 执行失败',
        description: error.message
      });
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, status: 'error', error: error.message } } : n
      ));
    }
  }, [nodes, setNodes, triggerDataTransfer, toast]);

  const handleMindmapInfoExecution = useCallback(async (nodeId: string, payload: any, isForced: boolean = false) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // 更新节点状态为运行中
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n
    ));

    try {
      // 确保存储已初始化
      if (!mindmapStorage.getCurrentMap()) {
        await mindmapStorage.init();
      }
      
      let mapData = mindmapStorage.getCurrentMap();
      let output = '';
      let mapName = mapData?.name || '';
      const infoType = node.data?.infoType || 'markdown';
      
      // 解析指令
      let isCommand = false;
      let targetMapName = '';
      let targetNodeName = '';
      let depth = 1;

      // 简单的指令解析逻辑
      // 支持格式：
      // 1. "files" / "list" -> 文件列表
      // 2. "map:名称" -> 切换/指定导图
      // 3. "node:名称" -> 指定节点
      // 4. "depth:数字" -> 指定深度
      // 5. 纯文本如果匹配当前导图的节点名，视为指定节点
      
      if (typeof payload === 'string' && payload.trim()) {
        const p = payload.trim();
        
        // 文件列表指令
        if (/^(files|list|ls|文件列表|导图列表)$/i.test(p)) {
            const maps = mindmapStorage.getMapsInCategory();
            output = "思维导图文件列表:\n" + maps.map(m => `- ${m.name} (ID: ${m.id})`).join('\n');
            isCommand = true;
        } else {
            // 解析参数
            const mapMatch = p.match(/(?:map|导图)[:：]\s*([^\s]+)/i);
            if (mapMatch) targetMapName = mapMatch[1];

            const nodeMatch = p.match(/(?:node|节点)[:：]\s*([^\s]+)/i);
            if (nodeMatch) {
                targetNodeName = nodeMatch[1];
            }

            const depthMatch = p.match(/(?:depth|深度|level|层级)[:：]\s*(\d+)/i);
            if (depthMatch) depth = parseInt(depthMatch[1], 10);
            
            // 如果没有显式指定 node，但 payload 匹配当前导图中的某个节点名
            if (!targetNodeName && !mapMatch && !depthMatch && mapData) {
                // 检查 payload 是否就是节点名
                // 为了避免误匹配普通文本，这里要求完全匹配
                if (mapData.nodes.some(n => n.name === p)) {
                    targetNodeName = p;
                    isCommand = true;
                }
            }

            if (mapMatch || nodeMatch || depthMatch) {
                isCommand = true;
            }
        }
      }

      if (isCommand && !output) {
          // 如果指定了导图，先尝试切换上下文（仅用于本次查询）
          if (targetMapName) {
              const maps = mindmapStorage.getMapsInCategory();
              const foundMap = maps.find(m => m.name === targetMapName);
              if (foundMap) {
                  mapData = foundMap;
                  mapName = foundMap.name;
              } else {
                  output = `未找到名为 "${targetMapName}" 的思维导图。`;
              }
          }

          if (!output) {
              if (!mapData) {
                  output = "未找到思维导图数据。";
              } else {
                  let targetNodeId = undefined;
                  if (targetNodeName) {
                      const targetNode = mapData.nodes.find(n => n.name === targetNodeName);
                      if (targetNode) {
                          targetNodeId = targetNode.id;
                      } else {
                           output = `在导图 "${mapName}" 中未找到节点 "${targetNodeName}"。`;
                      }
                  }

                  if (!output) {
                      // 使用 mindmapToMarkdown 获取指定结构
                      // 如果指定了 targetNodeName，depth 默认为 1（只看直接子级）
                      // 除非显式指定了 depth
                      // 用户需求：获取指定某一个思维导图或节点的n级子节点，默认为1级
                      
                      const result = mindmapToMarkdown(mapData.nodes, {
                          rootId: targetNodeId,
                          maxDepth: depth
                      });
                      
                      const depthStr = depth === Infinity ? "全部" : `${depth}级`;
                      const targetStr = targetNodeName ? `节点 "${targetNodeName}"` : `导图 "${mapName}"`;
                      
                      if (!result) {
                          output = `${targetStr} 下无内容 (深度: ${depthStr})`;
                      } else {
                          output = `${targetStr} 的子节点 (深度: ${depthStr}):\n${result}`;
                      }
                  }
              }
          }
      } else if (!output) {
        // 如果不是指令，或者是空指令，或者是触发器信号，则回退到 infoType 配置
        if (mapData && mapData.nodes) {
            mapName = mapData.name;
            
            switch (infoType) {
            case 'json':
                 output = JSON.stringify(mapData, null, 2);
                 break;

             case 'fileList':
                 const maps = mindmapStorage.getMapsInCategory();
                 output = "思维导图文件列表:\n" + maps.map(m => `- ${m.name} (ID: ${m.id})`).join('\n');
                 break;
                 
             case 'root':
                const rootNode = mapData.nodes.find((n: any) => n.isRoot);
                output = rootNode ? `中心主题: ${rootNode.name}` : '未找到中心主题';
                break;
                
            case 'summary':
                // 获取根节点和一级子节点
                const root = mapData.nodes.find((n: any) => n.isRoot);
                if (root) {
                const children = root.children?.map((id: string) => mapData!.nodes.find((n: any) => n.id === id)).filter(Boolean);
                const childrenNames = children?.map((c: any) => c.name).join('、');
                output = `思维导图摘要:\n中心主题: ${root.name}\n主要分支: ${childrenNames || '无'}`;
                } else {
                output = '未找到中心主题';
                }
                break;
                
            case 'structure':
                const structure = mindmapToMarkdown(mapData.nodes);
                output = structure;
                break;

            case 'markdown':
            default:
                const markdown = mindmapToMarkdown(mapData.nodes);
                output = `思维导图结构:\n${markdown}\n`;
                break;
            }
        } else {
            output = '当前没有打开的思维导图或思维导图为空。';
        }
      }

      // 模拟一点延迟以显示状态变化
      await new Promise(resolve => setTimeout(resolve, 300));

      setNodes(prev => prev.map(n =>
        n.id === nodeId
          ? {
            ...n,
            data: {
              ...n.data,
              status: 'completed',
              value: output,
              mapName: mapName,
              lastUpdate: new Date().toLocaleTimeString()
            }
          }
          : n
      ));

      triggerDataTransfer(nodeId, output, 'output', isForced);

    } catch (error: any) {
      console.error('Mindmap Info Execution Error:', error);
      toast({
        variant: 'destructive',
        title: '获取思维导图信息失败',
        description: error.message
      });
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, status: 'error', error: error.message } } : n
      ));
    }
  }, [nodes, setNodes, triggerDataTransfer, toast]);

  return {
    triggerDataTransfer,
    handleAINodeExecution,
    handlePythonExecution,
    handleUserInputSend,
    handleToggleMemory,
    handleClearHistory,
    handleSwitchSend,
    handleSwitchReceiveSignal,
    handleTrigger,
    handleSimpleTrigger,
    handleTextDisplayExecution,
    handleMindmapInfoExecution,
    flowStatus,
    runFlow,
    pauseFlow,
    stopFlow
  };
}
