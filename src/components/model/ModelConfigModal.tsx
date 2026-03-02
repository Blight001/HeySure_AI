/**
 * HeySure AI - AI 模型配置弹窗组件
 * 管理 AI 模型的配置：
 * - 添加新模型配置
 * - 编辑已有模型配置
 * - 模型参数设置（API密钥、模型名称、温度等）
 * - 模型启用/禁用
 * - API 提供商选择
 * - 模型测试功能
 */
import { useState, useEffect } from 'react';
import { Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useExtendedToast } from '../../hooks/useExtendedToast';

// 模型配置类型
export interface ModelConfig {
  id: string;
  name: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  enableMultiTurn: boolean;
  enableStreaming: boolean;
  enableThinking: boolean;
  enableWebSearch: boolean;
  enableWebScraping: boolean;
  enabled: boolean;
  requestCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

const generateRequestCode = (config: ModelConfig) => {
  const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/`/g, '').trim();
  const apiKey = (config.apiKey || '').replace(/`/g, '').trim();
  const model = (config.model || 'gpt-3.5-turbo').replace(/`/g, '').trim();
  const enableStreaming = config.enableStreaming;

  return `/**
 * Custom Request Handler
 * @param {object} params - { messages }
 * @param {object} context - { fetch }
 * @returns {Promise<Response>}
 */
async function request(params, context) {
  const { messages } = params;
  const { fetch } = context;

  // Build messages array
  const formattedMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  // Create request body
  const body = {
    model: "${model}",
    messages: formattedMessages,
    stream: ${enableStreaming}
  };

  // Make request
  const response = await fetch("${baseUrl}/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': "Bearer ${apiKey}"
    },
    body: JSON.stringify(body)
  });

  return response;
}`;
};

// 常用模型配置模板
export const API_URL_TEMPLATES = [
  { name: '通义千问 (阿里云)', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: 'OpenAI GPT-4o', url: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { name: 'OpenAI GPT-4', url: 'https://api.openai.com/v1', model: 'gpt-4' },
  { name: 'OpenAI GPT-3.5', url: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
  { name: 'Anthropic Claude', url: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  { name: '智谱 AI', url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' },
  { name: 'Moonshot AI', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: 'MiniMax', url: 'https://api.minimax.chat/v1', model: 'abab6.5s-chat' },
  { name: '阶跃星辰', url: 'https://api.stepfun.com/v1', model: 'step-1v-8k' },
];

interface ModelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ModelConfig) => Promise<void>;
  modelConfig: ModelConfig | null;
  isSaving?: boolean;
}

export function ModelConfigModal({ isOpen, onClose, onSave, modelConfig, isSaving = false }: ModelConfigModalProps) {
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const { toast } = useExtendedToast();
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen && modelConfig) {
      let code = modelConfig.requestCode || generateRequestCode(modelConfig);
      
      // Force upgrade old-style code to new style with hardcoded values
      if (code.includes('const { baseUrl, apiKey, model, enableStreaming } = modelConfig;') || code.includes('// Configuration Constants - DO NOT MODIFY STRUCTURE')) {
        code = generateRequestCode(modelConfig);
      }

      setEditingModel({
        ...modelConfig,
        requestCode: code
      });
    }
  }, [isOpen, modelConfig]);

  if (!isOpen || !editingModel) return null;

  const handleTest = async () => {
    if (!editingModel) return;
    setIsTesting(true);
    try {
      // Use the current editingModel which contains the possibly modified requestCode
      const response = await window.electronAPI.ai.chat({
        modelConfig: editingModel,
        messages: [{ role: 'user', content: 'Hello (Test)' }]
      });
      
      if (response.success) {
        toast({
          title: '测试成功',
          description: `AI回复: ${response.data?.substring(0, 100)}...`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: '测试失败',
          description: response.error || '未知错误',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '测试出错',
        description: error.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (editingModel) {
      await onSave(editingModel);
    }
  };

  const updateCodeVariable = (code: string, type: 'model' | 'baseUrl' | 'apiKey', value: string) => {
    const cleanValue = value.replace(/"/g, '\\"');
    switch (type) {
      case 'model':
        // Replace model: "..." or model: '...'
        return code.replace(/(model:\s*["'])([^"']*)(["'])/, `$1${cleanValue}$3`);
      case 'baseUrl':
        // Replace fetch(".../chat/completions" or fetch('.../chat/completions'
        return code.replace(/(fetch\(["'])([^"']*)(\/chat\/completions["'])/, `$1${cleanValue}$3`);
      case 'apiKey':
        // Replace 'Authorization': "Bearer ..." or 'Authorization': 'Bearer ...'
        return code.replace(/('Authorization':\s*["']Bearer )([^"']*)(["'])/, `$1${cleanValue}$3`);
      default:
        return code;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl h-[85vh] flex flex-col rounded-lg bg-background shadow-xl overflow-hidden">
        {/* 头部 */}
        <div className="flex-none flex items-center justify-between border-b px-6 py-4 bg-background z-10">
          <div>
            <h2 className="text-xl font-semibold">
              {editingModel.id.includes('new') || !editingModel.createdAt ? '创建/编辑模型' : '编辑模型'}
            </h2>
            <p className="text-sm text-muted-foreground">
              配置 AI 模型的连接参数和功能选项
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            ✕
          </Button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：基本配置 */}
          <div className="w-[400px] flex-none overflow-y-auto p-6 space-y-6 border-r">
            <h3 className="font-medium sticky top-0 bg-background pb-2 z-10">基本配置</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">显示名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：我的通义千问"
                  value={editingModel.name}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, name: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  便于识别的名称
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">模型名称 *</Label>
                <Input
                  id="model"
                  placeholder="例如：qwen-plus"
                  value={editingModel.model}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setEditingModel({
                      ...editingModel,
                      model: newVal,
                      requestCode: updateCodeVariable(editingModel.requestCode || '', 'model', newVal)
                    });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  API 调用时使用的模型标识符
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">API 地址</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://api.openai.com/v1"
                  value={editingModel.baseUrl}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setEditingModel({
                      ...editingModel,
                      baseUrl: newVal,
                      requestCode: updateCodeVariable(editingModel.requestCode || '', 'baseUrl', newVal)
                    });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  API 服务器地址
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={editingModel.apiKey}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setEditingModel({
                      ...editingModel,
                      apiKey: newVal,
                      requestCode: updateCodeVariable(editingModel.requestCode || '', 'apiKey', newVal)
                    });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  API 密钥
                </p>
              </div>
            </div>
          </div>

          {/* 右侧：请求代码配置 */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden bg-muted/10">
            <div className="flex items-center justify-between mb-2">
              <Label className="font-medium">请求代码配置 (JavaScript)</Label>
            </div>
            
            <div className="flex-1 border rounded-md overflow-hidden bg-background shadow-sm">
              <Textarea
                value={editingModel.requestCode}
                onChange={(e) => setEditingModel({ ...editingModel, requestCode: e.target.value })}
                className="w-full h-full font-mono text-xs resize-none border-0 focus-visible:ring-0 p-4 leading-relaxed"
                spellCheck={false}
              />
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p>支持全局变量: <code className="bg-muted px-1 rounded border">fetch</code>, <code className="bg-muted px-1 rounded border">messages</code>, <code className="bg-muted px-1 rounded border">modelConfig</code></p>
              <p>请直接修改代码中的 <code className="text-primary">baseUrl</code>, <code className="text-primary">apiKey</code>, <code className="text-primary">model</code> 变量值。</p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex-none flex items-center justify-end gap-3 border-t px-6 py-4 bg-background">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button variant="secondary" onClick={handleTest} disabled={isTesting}>
            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            测试
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              '保存配置'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
