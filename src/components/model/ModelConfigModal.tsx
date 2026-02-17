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
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  createdAt?: string;
  updatedAt?: string;
}

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
  const [featuresCollapsed, setFeaturesCollapsed] = useState(true);

  useEffect(() => {
    if (isOpen && modelConfig) {
      setEditingModel({ ...modelConfig });
    }
  }, [isOpen, modelConfig]);

  if (!isOpen || !editingModel) return null;

  const handleSelectTemplate = (template: typeof API_URL_TEMPLATES[0]) => {
    setEditingModel({
      ...editingModel,
      baseUrl: template.url,
      model: template.model,
    });
  };

  const handleSave = async () => {
    if (editingModel) {
      await onSave(editingModel);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg bg-background shadow-xl">
        {/* 头部 */}
        <div className="flex-none flex items-center justify-between border-b p-6">
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 基本配置 */}
          <div className="space-y-4">
            <h3 className="font-medium">基本配置</h3>
            <div className="grid gap-4 sm:grid-cols-2">
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
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, model: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  API 调用时使用的模型标识符
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseUrl">API 地址</Label>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" type="button">
                      常用模板
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>选择 API 模板（将自动填充地址和模型名称）</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {API_URL_TEMPLATES.map((template) => (
                      <DropdownMenuItem
                        key={template.url}
                        onClick={() => handleSelectTemplate(template)}
                        className="flex flex-col items-start gap-1 py-2"
                      >
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {template.url}
                        </span>
                        <span className="text-xs text-primary">
                          模型: {template.model}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  id="baseUrl"
                  placeholder="https://api.openai.com/v1"
                  className="flex-1"
                  value={editingModel.baseUrl}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, baseUrl: e.target.value })
                  }
                />
              </div>
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
                onChange={(e) =>
                  setEditingModel({ ...editingModel, apiKey: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                你的 API 密钥，不会被保存到服务器
              </p>
            </div>
          </div>

          {/* 功能选项 */}
          <div className="space-y-4">
            <button
              onClick={() => setFeaturesCollapsed(!featuresCollapsed)}
              className="flex items-center gap-2 w-full font-medium hover:text-primary transition-colors"
            >
              {featuresCollapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
              功能选项 {featuresCollapsed && '(收起)'}
            </button>

            {!featuresCollapsed && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="enableMultiTurn" className="text-base">
                      多轮对话
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      保持对话上下文，支持连续对话
                    </p>
                  </div>
                  <Switch
                    id="enableMultiTurn"
                    checked={editingModel.enableMultiTurn}
                    onCheckedChange={(checked) =>
                      setEditingModel({ ...editingModel, enableMultiTurn: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="enableStreaming" className="text-base">
                      流式输出
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      实时显示 AI 生成的内容 (stream=True)
                    </p>
                  </div>
                  <Switch
                    id="enableStreaming"
                    checked={editingModel.enableStreaming}
                    onCheckedChange={(checked) =>
                      setEditingModel({ ...editingModel, enableStreaming: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="enableThinking" className="text-base">
                      深度思考
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      启用推理模式，让 AI 进行更深入的思考
                      <code className="mx-1 rounded bg-muted px-1">{`extra_body={"enable_thinking": true}`}</code>
                    </p>
                  </div>
                  <Switch
                    id="enableThinking"
                    checked={editingModel.enableThinking}
                    onCheckedChange={(checked) =>
                      setEditingModel({ ...editingModel, enableThinking: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="enableWebSearch" className="text-base">
                      联网搜索
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      让 AI 可以搜索互联网获取最新信息
                      (tools=[{`"type": "web_search"`}, ...])
                    </p>
                  </div>
                  <Switch
                    id="enableWebSearch"
                    checked={editingModel.enableWebSearch}
                    onCheckedChange={(checked) =>
                      setEditingModel({
                        ...editingModel,
                        enableWebSearch: checked,
                        enableWebScraping: checked
                          ? editingModel.enableWebScraping
                          : false,
                      })
                    }
                  />
                </div>

                {editingModel.enableWebSearch && (
                  <div className="flex items-center justify-between rounded-lg border border-primary/50 p-4 bg-primary/5">
                    <div>
                      <Label htmlFor="enableWebScraping" className="text-base">
                        网页爬取
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        抓取网页内容进行分析
                        (需要同时开启联网搜索)
                      </p>
                    </div>
                    <Switch
                      id="enableWebScraping"
                      checked={editingModel.enableWebScraping}
                      onCheckedChange={(checked) =>
                        setEditingModel({
                          ...editingModel,
                          enableWebScraping: checked,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 底部按钮 */}
          <div className="flex-none flex items-center justify-end gap-3 border-t pt-6 mt-4">
              <Button variant="outline" onClick={onClose}>
                取消
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
    </div>
  );
}
