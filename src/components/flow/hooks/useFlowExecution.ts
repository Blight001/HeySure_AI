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

  // 同步状态到 ref
  useEffect(() => {
    flowStatusRef.current = flowStatus;
  }, [flowStatus]);
  
  // 使用 ref 追踪最新的 nodes，解决闭包中的 stale state 问题
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // 暂停流程
  const pauseFlow = useCallback(() => {
    setFlowStatus('paused');
  }, []);

  // 停止流程
  const stopFlow = useCallback(() => {
    setFlowStatus('idle');
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
    setTimeout(() => {
      const executeTransfer = () => {
        // 清除动画状态
        setAnimatingEdges(prev => {
          const next = new Set(prev);
          outgoingEdges.forEach(edge => next.delete(edge.id));
          return next;
        });

        // 1. 更新目标节点的数据
        setNodes(prev => {
          const nextNodes = [...prev];
          outgoingEdges.forEach(edge => {
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
        
        outgoingEdges.forEach(edge => {
          const targetNode = latestNodes.find(n => n.id === edge.target);
          if (!targetNode) return;

          // 检查是否连接到输出端口（中继模式）
          const isTargetOutput = targetNode.outputs.some(o => o.id === edge.targetHandle);
          if (isTargetOutput) {
            // 直接中继信号，不执行节点逻辑，也不改变节点状态
            // 指定 sourceHandleId 为接收到信号的端口，确保信号只从该端口流出
            triggerDataTransfer(targetNode.id, payload, 'output', isForced, edge.targetHandle);
            return;
          }

          // 检查是否为 Input-to-Input 中继 (当数据到达输入端口时，立即触发从该端口引出的连线)
          const isTargetInput = targetNode.inputs.some(i => i.id === edge.targetHandle);
          if (isTargetInput) {
             const hasInputRelay = edges.some(e => e.source === targetNode.id && e.sourceHandle === edge.targetHandle);
             if (hasInputRelay) {
                // 立即中继原始数据，不等待节点执行
                triggerDataTransfer(targetNode.id, payload, 'input', isForced, edge.targetHandle);
             }
          }

          if (targetNode.type === 'aiChat') {
            handleAINodeExecution(targetNode.id, payload, isForced);
          } else if (targetNode.type === 'python') {
            handlePythonExecution(targetNode.id, payload, isForced);
          } else if (targetNode.type === 'switch') {
            handleSwitchReceiveSignal(targetNode.id, payload, targetNode.data?.isOn ?? false, isForced);
          } else if (targetNode.type === 'textDisplay') {
            handleTextDisplayExecution(targetNode.id, payload, edge.target, isForced);
          } else if (targetNode.type === 'userInput') {
            handleUserInputSend(targetNode.id, undefined, isForced);
          } else if (targetNode.type === 'end') {
            // 遇到结束节点，停止流程
            stopFlow();
            // 5秒后自动清理节点状态
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            resetTimerRef.current = setTimeout(() => {
              resetNodesStatus();
              resetTimerRef.current = null;
            }, 5000);
          } else {
            // 对于其他节点，让数据通过
            // 递归调用也需要受控，但这里通过 setTimeout 再次进入 triggerDataTransfer，会自动检查状态
            setTimeout(() => {
              triggerDataTransfer(targetNode.id, payload, 'output', isForced);
            }, animationSpeed * 1000);
          }
        });
      };

      // 检查当前流程状态
      if (flowStatusRef.current === 'idle' && !isForced) {
        // 如果已停止，仅清除动画，不执行后续逻辑
        setAnimatingEdges(prev => {
          const next = new Set(prev);
          outgoingEdges.forEach(edge => next.delete(edge.id));
          return next;
        });
        return;
      }

      if (flowStatusRef.current === 'paused') {
        // 如果暂停，将执行逻辑加入队列
        pendingTasksRef.current.push(executeTransfer);
        return;
      }

      // 正常运行
      executeTransfer();

    }, animationSpeed * 1000);
  }, [nodes, edges, animationSpeed, setAnimatingEdges, stopFlow, resetNodesStatus]); // 依赖保持不变

  // 运行流程
  const runFlow = useCallback(() => {
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
      const node = nodes.find(n => n.id === nodeId);
      if (!node) throw new Error("节点未找到");

      const modelId = node.data?.modelId;
      const modelConfig = node.data?.model;
      const useMemory = node.data?.useMemory !== false;

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

      const prevTokenStats = node.data?.tokenStats || {
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

      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: output,
        timestamp: Date.now()
      };

      setNodes(prev => prev.map(n => {
        if (n.id === nodeId) {
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
    triggerDataTransfer(nodeId, payload, 'output', isForced);
    
    setTimeout(() => {
        setNodes(prev => prev.map(n => 
            n.id === nodeId ? { ...n, data: { ...n.data, status: 'completed' } } : n
        ));
    }, animationSpeed * 1000);
  }, [nodes, setNodes, triggerDataTransfer, animationSpeed, toast]);

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
    triggerDataTransfer(nodeId, payload, 'output', true);

    setTimeout(() => {
      setNodes(prev => prev.map(n =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, status: 'completed', pendingSignal: undefined, hasPendingSignal: false } }
          : n
      ));
    }, animationSpeed * 1000);

    toast({
      title: "信号已发送",
      description: "信号已转发到下游节点",
      duration: 2000
    });
  }, [nodes, setNodes, triggerDataTransfer, animationSpeed, toast]);

  const handleSwitchReceiveSignal = useCallback((nodeId: string, signal: any, isOn: boolean, isForced: boolean = false) => {
    if (isOn) {
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n
      ));
      triggerDataTransfer(nodeId, signal, 'output', isForced);
      setTimeout(() => {
        setNodes(prev => prev.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, status: 'completed' } } : n
        ));
      }, animationSpeed * 1000);
    } else {
      setNodes(prev => prev.map(n => 
        n.id === nodeId 
        ? { ...n, data: { ...n.data, pendingSignal: signal, hasPendingSignal: true, lastSignalTime: new Date().toLocaleTimeString() } } 
        : n
      ));
    }
  }, [setNodes, triggerDataTransfer, animationSpeed]);

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
    flowStatus,
    runFlow,
    pauseFlow,
    stopFlow
  };
}
