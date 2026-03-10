/**
 * HeySure AI - 主页/聊天页面
 * 负责展示聊天界面、消息列表、模型选择、发送消息等功能
 * 支持普通对话、思维导图模式、操作流程模式的聊天交互
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessageStore, useDialogStore, useUiStore } from '@/stores';
import { MessageServiceWrapper, MessageService, ModelService, FlowService } from '@/services/apiService';
import { ChatInput, MessageList } from '@/components/chat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExtendedToast, ExtendedToast } from '../hooks/useExtendedToast';
import { useAiStreamListener } from '@/hooks/useAiStreamListener';
import type { Message } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/utils/helpers';
import { MessageSquare, Map as MapIcon, GitBranch, PlayCircle } from 'lucide-react';
import { chatBridge, ChatMode, BridgeMessage } from '@/services/chatBridge';
import { HeadlessFlowExecutor } from '@/components/flow/services/HeadlessFlowExecutor';

interface ModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  model: string;
  apiKey?: string;
}

interface FlowConfig {
  id: string;
  name: string;
}

export default function HomePage() {
  const { dialogId } = useParams();
  const navigate = useCustomNavigate();
  const { toast } = useExtendedToast();
  const { messages, setMessages, addMessage, updateMessage, setLoading, setStreaming } = useMessageStore();
  const { dialogs } = useDialogStore();
  const { chatMode, setChatMode } = useUiStore();

  // 是否正在等待 AI 回复（显示加载动画）
  const { isWaitingForAI, setIsWaitingForAI } = useAiStreamListener(dialogId);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [flows, setFlows] = useState<FlowConfig[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [bridgeMessages, setBridgeMessages] = useState<Message[]>([]);
  const [isBridgeReady, setIsBridgeReady] = useState(false);
  const [processFlowMessages, setProcessFlowMessages] = useState<Message[]>([]);

  // 监听 ChatBridge 消息
  useEffect(() => {
    if (chatMode === 'default') return;

    const updateMessages = (msgs: BridgeMessage[]) => {
      // 转换 BridgeMessage 到 Message
      const converted: Message[] = msgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content, // 使用 raw content，不包含 prompt
        timestamp: m.timestamp,
        dialogId: 'bridge', // 虚拟 ID
        metadata: {}, // Message 类型需要 metadata 属性
      }));
      setBridgeMessages(converted);
    };

    const handleMessageUpdate = (data: { mode: ChatMode; messages: BridgeMessage[] }) => {
      if (data.mode === chatMode) {
        updateMessages(data.messages);
      }
    };

    const checkHandler = () => {
      const msgs = chatBridge.getMessages(chatMode as ChatMode);
      if (msgs) {
        updateMessages(msgs);
        setIsBridgeReady(true);
      } else {
        setIsBridgeReady(false);
      }
    };

    // 初始检查
    checkHandler();

    // 订阅事件
    chatBridge.on('messageUpdate', handleMessageUpdate);
    chatBridge.on('handlerRegistered', checkHandler);
    chatBridge.on('handlerUnregistered', checkHandler);

    return () => {
      chatBridge.off('messageUpdate', handleMessageUpdate);
      chatBridge.off('handlerRegistered', checkHandler);
      chatBridge.off('handlerUnregistered', checkHandler);
    };
  }, [chatMode]);


  


  // 加载对话消息
  useEffect(() => {
    const loadMessages = async () => {
      if (!dialogId) return;
      
      try {
        setLoading(true);
        const msgs = await MessageService.list(dialogId);

        // 合并现有流式消息和乐观更新消息，防止被加载的历史消息覆盖导致闪烁
        const state = useMessageStore.getState();
        const pendingMsgs = state.messages.filter(m => 
          m.dialogId === dialogId && (m.metadata?.streamed || m.metadata?.optimistic)
        );
        
        // 如果历史消息中没有包含 pending 消息，则追加
        const mergedMsgs = [...msgs];
        pendingMsgs.forEach(pMsg => {
          if (!mergedMsgs.some(m => m.id === pMsg.id)) {
            mergedMsgs.push(pMsg);
          }
        });
        
        setMessages(mergedMsgs);
      } catch (error) {
        console.error('加载消息失败:', error);
        toast({
          title: '加载失败',
          description: '无法加载对话消息',
          variant: 'destructive',
        } as ExtendedToast);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [dialogId, setMessages, toast]);

  // 检测并自动删除空对话
  useEffect(() => {
    // 保存当前 dialogId 供 cleanup 使用
    const currentId = dialogId;

    // cleanup 函数在组件卸载或 dialogId 改变时执行
    return () => {
      // 如果没有当前 dialogId，或者 cleanup 时已经切换到其他对话
      if (currentId && currentId !== dialogId) {
        const dialogStore = useDialogStore.getState();
        const messageStore = useMessageStore.getState();
        const messages = messageStore.messages.filter((m: any) => m.dialogId === currentId);
        const hasUserMessage = messages.some((m: any) => m.role === 'user');

        if (dialogStore.isNewEmptyDialog(currentId, hasUserMessage)) {
          // 不删除操作流程浮窗对话 (flow_floating_) 和思维导图浮窗对话 (floating_)
          if (currentId.startsWith('flow_floating_') || currentId.startsWith('floating_')) {
            console.log('Skipping auto-delete for floating dialog:', currentId);
            return;
          }
          // 在下一个 tick 执行删除，避免影响当前渲染
          setTimeout(async () => {
            try {
              await window.ipcRenderer.dialog.delete(currentId);
              dialogStore.removeDialog(currentId);
              console.log('已自动删除空对话:', currentId);
            } catch (error) {
              console.error('删除空对话失败:', error);
            }
          }, 0);
        }
      }
    };
  }, [dialogId]);

  // 加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        const list = await ModelService.list();
        const enabledModels = list.filter((m: ModelConfig) => m.enabled);
        setModels(enabledModels);
        
        // 如果有启用的模型，自动选择第一个
        if (enabledModels.length > 0 && !selectedModelId && chatMode !== 'process_flow') {
          setSelectedModelId(enabledModels[0].id);
        }
      } catch (error) {
        console.error('加载模型列表失败:', error);
      }
    };
    loadModels();
  }, []);

  // 加载流程列表 (当模式为 process_flow 时)
  useEffect(() => {
    if (chatMode === 'process_flow') {
      const loadFlows = async () => {
        try {
          // 1. 获取所有流程
          const list = await FlowService.list();

          // 2. 获取分类数据
          const categoryData = await FlowService.getCategories();
          const categories = categoryData?.categories || [];

          // 3. 筛选 "对话流程" 分类的流程
          // 如果没有 "对话流程" 分类，或者该分类下没有流程，则列表为空
          const dialogueCategory = categories.find((c: any) => c.name === '对话流程');
          let filteredFlows: any[] = [];
          
          if (dialogueCategory && Array.isArray(dialogueCategory.flowIds)) {
             filteredFlows = list.filter((f: any) => dialogueCategory.flowIds.includes(f.id));
          } else {
             // 尝试查找包含 "对话" 关键字的分类作为备选? 
             // 严格按照需求: "操作流程中的对话流程文件夹" -> 必须是 "对话流程" 分类
             // 如果没有找到，就为空
             console.warn('未找到 "对话流程" 分类，流程列表将为空');
          }

          setFlows(filteredFlows.map((f: any) => ({ id: f.id, name: f.name })));
          
          if (filteredFlows.length > 0) {
            setSelectedModelId(filteredFlows[0].id);
          } else {
            setSelectedModelId('');
          }
        } catch (error) {
          console.error('加载流程列表失败:', error);
          toast({
            title: '加载失败',
            description: '无法加载流程列表',
            variant: 'destructive',
          } as ExtendedToast);
        }
      };
      loadFlows();
    } else if (chatMode === 'default' && models.length > 0) {
       // Switch back to default model if switching back to default mode
       // But we don't know which one was selected before. Just pick first enabled.
       const enabled = models.filter(m => m.enabled);
       if (enabled.length > 0) setSelectedModelId(enabled[0].id);
    }
  }, [chatMode, models]);

  // 发送消息处理
  const handleSendMessage = async (content: string, modelId?: string) => {
    if (!content.trim()) return;

    // 处理流程对话模式
    if (chatMode === 'process_flow') {
      const flowId = modelId || selectedModelId;
      if (!flowId) {
        toast({
          title: '无法发送',
          description: '请先选择一个流程',
          variant: 'destructive',
        } as ExtendedToast);
        return;
      }

      // 添加用户消息
      const userMsg: Message = {
        id: uuidv4(),
        role: 'user',
        content: content,
        timestamp: Date.now(),
        dialogId: 'process_flow',
        metadata: {},
      };
      setProcessFlowMessages(prev => [...prev, userMsg]);
      setIsWaitingForAI(true);

      try {
        const flowData = await FlowService.get(flowId);
        if (!flowData) throw new Error(`无法获取流程数据: ${flowId}`);

        // 执行流程
         await new Promise<void>(async (resolve, reject) => {
           // 注入用户输入 - 必须在创建 executor 之前修改 flowData
           const userInputNode = flowData.nodes.find((n: any) => n.type === 'userInput');
           if (userInputNode) {
             if (!userInputNode.data) userInputNode.data = {};
             userInputNode.data.value = content;
             // 立即保存以更新文件中的输入内容
             try {
               await FlowService.save(flowData);
             } catch (e) {
               console.error("保存流程输入失败", e);
             }
           }

           const executor = new HeadlessFlowExecutor(flowData, {
             outputMode: 'all_text',
             onNodeUpdate: (nodeId, data) => {
               // 同步更新本地 flowData，以便最后保存执行结果
               const node = flowData.nodes.find((n: any) => n.id === nodeId);
               if (node) {
                 node.data = { ...node.data, ...data };
               }
             },
             onFlowComplete: async (outputs: string[]) => {
               // 保存最终执行状态到文件
               try {
                 await FlowService.save(flowData);
               } catch (e) {
                 console.error("保存流程执行结果失败", e);
               }

              // 将所有输出作为助手消息添加
              if (Array.isArray(outputs) && outputs.length > 0) {
                 const assistantMsgs = outputs.map(out => ({
                    id: uuidv4(),
                    role: 'assistant' as const,
                    content: out,
                    timestamp: Date.now(),
                    dialogId: 'process_flow',
                    metadata: {},
                 }));
                 setProcessFlowMessages(prev => [...prev, ...assistantMsgs]);
              } else if (outputs && !Array.isArray(outputs)) {
                 // Fallback if output is not array
                 setProcessFlowMessages(prev => [...prev, {
                    id: uuidv4(),
                    role: 'assistant',
                    content: String(outputs),
                    timestamp: Date.now(),
                    dialogId: 'process_flow',
                    metadata: {},
                 }]);
              }
              resolve();
            },
            onFlowError: (err) => {
               reject(err);
             }
           });
 
           executor.start();
         });

      } catch (error: any) {
        console.error('流程执行失败:', error);
        toast({
          title: '执行失败',
          description: error.message || '流程执行出错',
          variant: 'destructive',
        } as ExtendedToast);
        
        // 添加错误消息
        setProcessFlowMessages(prev => [...prev, {
            id: uuidv4(),
            role: 'assistant',
            content: `执行出错: ${error.message}`,
            timestamp: Date.now(),
            dialogId: 'process_flow',
            metadata: { isError: true },
        }]);
      } finally {
        setIsWaitingForAI(false);
      }
      return;
    }

    // 处理 Bridge 模式消息发送
    if (chatMode !== 'default') {
      const currentModel = models.find(m => m.id === (modelId || selectedModelId));
      chatBridge.sendMessage(chatMode as ChatMode, content, currentModel);
      return;
    }

    let currentDialogId = dialogId;

    // 如果没有对话 ID，创建一个新对话
    if (!currentDialogId) {
      try {
        const newDialog = await MessageServiceWrapper.createDialog({
          title: content.slice(0, 20) + (content.length > 20 ? '...' : ''),
          type: 'chat',
        });
        if (newDialog?.id) {
          currentDialogId = newDialog.id;
          // 更新路由
          navigate(`/chat/${newDialog.id}`, { replace: true });
        }
      } catch (error) {
        console.error('创建对话失败:', error);
        toast({
          title: '创建对话失败',
          description: '无法创建新对话，请重试',
          variant: 'destructive',
        } as ExtendedToast);
        return;
      }
    }

    setLoading(true);
    setStreaming(true);
    // 开始显示等待动画
    setIsWaitingForAI(true);

    const userMessageId = uuidv4();
    const currentId = currentDialogId as string;
    const optimisticUserMessage: Message = {
      id: userMessageId,
      dialogId: currentId,
      role: 'user',
      content: content,
      timestamp: Date.now(),
      metadata: { optimistic: true },
    };
    addMessage(optimisticUserMessage);

    try {
      // 发送消息
      const response = await MessageService.send(
        currentId,
        content,
        modelId ? [modelId] : undefined,
        userMessageId
      );

      response.forEach((msg: Message) => {
        // 检查消息是否已存在
        const exists = useMessageStore.getState().messages.some(m => m.id === msg.id);
        if (exists) {
            updateMessage(msg.id, msg);
        } else {
            addMessage(msg);
        }
      });

      // 生成智能标题（针对新对话或未命名对话）
      if ((!dialogId || currentDialog?.title === '新对话') && response.length > 0 && currentDialogId) {
        setTimeout(async () => {
          generateSmartTitle(currentDialogId, content, response[0].content);
        }, 100);
      }
    } catch (error: any) {
      toast({
        title: '发送消息失败',
        description: error.message,
        variant: 'destructive',
      } as ExtendedToast);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const handleStop = () => {
    setLoading(false);
    setStreaming(false);
    setIsWaitingForAI(false);
  };

  // 智能生成标题函数（简化版）
  const generateSmartTitle = async (
    dialogId: string,
    userContent: string,
    _aiContent: string
  ) => {
    try {
      const newTitle = userContent.slice(0, 15) + (userContent.length > 15 ? '...' : '');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedDialog = await MessageServiceWrapper.updateDialog(dialogId, {
        title: newTitle,
      });
      
      if (updatedDialog) {
        useDialogStore.getState().updateDialog(dialogId, updatedDialog);
      }
    } catch (error) {
      console.warn('智能标题生成失败:', error);
    }
  };

  const currentDialog = Array.isArray(dialogs) ? dialogs.find((d) => d.id === dialogId) : null;
  const filteredMessages = useMemo(() => {
    if (chatMode === 'process_flow') {
      return processFlowMessages;
    }
    if (chatMode !== 'default') {
      return bridgeMessages;
    }
    return dialogId
      ? messages.filter((m) => m.dialogId === dialogId)
      : messages;
  }, [dialogId, messages, chatMode, bridgeMessages, processFlowMessages]);

  return (
    <div className="flex h-full w-full bg-background transition-all duration-300">
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 头部 */}
        <div className="h-14 border-b flex items-center justify-between px-4 bg-background flex-shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <h1 className="text-lg font-semibold truncate">
              {currentDialog?.title || 'HeySure AI'}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 模式选择 */}
            <Select
              value={chatMode}
              onValueChange={(v: any) => setChatMode(v)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="模式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <span className="flex items-center gap-2">
                    <MessageSquare size={14} />
                    <span>普通对话</span>
                  </span>
                </SelectItem>
                <SelectItem value="mindmap">
                  <span className="flex items-center gap-2">
                    <MapIcon size={14} />
                    <span>思维导图</span>
                  </span>
                </SelectItem>
                <SelectItem value="flow">
                  <span className="flex items-center gap-2">
                    <GitBranch size={14} />
                    <span>操作流程</span>
                  </span>
                </SelectItem>
                <SelectItem value="process_flow">
                  <span className="flex items-center gap-2">
                    <PlayCircle size={14} />
                    <span>流程对话</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* 模型/流程选择 */}
            <Select
              value={selectedModelId}
              onValueChange={setSelectedModelId}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={chatMode === 'process_flow' ? "选择流程" : "选择模型"} />
              </SelectTrigger>
              <SelectContent>
                {chatMode === 'process_flow' ? (
                  flows.map((flow) => (
                    <SelectItem key={flow.id} value={flow.id}>
                      <span className="flex items-center gap-2">
                        <GitBranch size={14} />
                        <span className="truncate max-w-[100px]">{flow.name}</span>
                      </span>
                    </SelectItem>
                  ))
                ) : (
                  models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="flex items-center gap-2">
                        <span>🤖</span>
                        <span className="truncate max-w-[100px]">{model.name}</span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-auto">
          {chatMode !== 'default' && chatMode !== 'process_flow' && !isBridgeReady ? (
             <div className="flex h-full items-center justify-center text-muted-foreground">
               请先在对应的{chatMode === 'mindmap' ? '思维导图' : '操作流程'}中选择一个模型以激活对话
             </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 text-6xl">🤖</div>
                <h2 className="text-xl font-semibold mb-2">HeySure AI</h2>
                <p className="text-muted-foreground mb-4">
                  {chatMode === 'process_flow' 
                    ? (flows.length === 0 ? '暂无流程文件' : '选择一个流程开始对话')
                    : (models.length === 0 
                        ? '请先在"插件配置"页面添加自定义模型'
                        : '选择一个模型开始对话')
                  }
                </p>
              </div>
            </div>
          ) : (
            <MessageList
              messages={filteredMessages}
              isWaitingForAI={isWaitingForAI}
            />
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t p-4">
          <ChatInput
            dialogId={chatMode === 'default' ? (dialogId || '') : 'bridge'}
            onSend={handleSendMessage}
            onStop={handleStop}
            selectedModelId={selectedModelId}
            modelName={models.find(m => m.id === selectedModelId)?.name}
            disabled={(!selectedModelId && chatMode === 'default') || (chatMode !== 'default' && !isBridgeReady)}
          />
        </div>
      </div>
    </div>
  );
}

// 自定义路由导航 hook
function useCustomNavigate() {
  const navigate = useNavigate();

  return (path: string, options?: { replace: boolean }) => {
    navigate(path, options);
  };
}
