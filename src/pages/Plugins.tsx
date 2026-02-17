/**
 * HeySure AI - 插件配置页面
 * 负责AI模型配置的管理，包括：
 * - 加载已保存的模型配置列表
 * - 创建新模型配置
 * - 编辑已有模型配置
 * - 删除模型配置
 * - 切换模型启用/禁用状态
 */
import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ModelConfigModal, type ModelConfig, API_URL_TEMPLATES } from '@/components/model/ModelConfigModal';

export default function PluginsPage() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModel, setDeleteModel] = useState<ModelConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // 加载已保存的模型配置
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await window.electronAPI?.modelList?.();
        if (response?.success && response.data) {
          setModels(response.data);
        }
      } catch (error) {
        console.error('加载模型配置失败:', error);
      }
    };
    loadModels();
  }, []);

  // 创建新模型
  const handleCreateModel = (template?: typeof API_URL_TEMPLATES[0]) => {
    const newModel: ModelConfig = {
      id: `model-${Date.now()}`,
      name: template?.name || '新模型',
      model: template?.model || '',
      apiKey: '',
      baseUrl: template?.url || '',
      enableMultiTurn: true,
      enableStreaming: true,
      enableThinking: false,
      enableWebSearch: false,
      enableWebScraping: false,
      enabled: false,
    };
    setEditingModel(newModel);
  };

  // 选择 API 地址模板
  // const handleSelectTemplate = (template: typeof API_URL_TEMPLATES[0]) => {
  //   if (editingModel) {
  //     setEditingModel({
  //       ...editingModel,
  //       baseUrl: template.url,
  //       model: template.model,
  //     });
  //   }
  // };

  // 编辑模型
  const handleEditModel = (model: ModelConfig) => {
    setEditingModel({ ...model });
  };

  // 保存模型
  const handleSaveModel = async (modelToSave: ModelConfig) => {
    if (!modelToSave.name.trim()) {
      toast({
        title: '保存失败',
        description: '请输入模型名称',
        variant: 'destructive',
      });
      return;
    }

    if (!modelToSave.apiKey.trim()) {
      toast({
        title: '保存失败',
        description: '请输入 API Key',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      console.log('保存模型配置:', modelToSave);
      // 调用 electron API 保存
      const response = await window.ipcRenderer.invoke('model:save', modelToSave);
      console.log('保存响应:', response);

      if (response?.success) {
        setModels((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === modelToSave.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = response.data;
            return updated;
          } else {
            return [...prev, response.data];
          }
        });
        setEditingModel(null);
        toast({
          title: '保存成功',
          description: `模型 "${modelToSave.name}" 已保存`,
        });
      } else {
        throw new Error(response?.error || '保存失败');
      }
    } catch (error: any) {
      toast({
        title: '保存失败',
        description: error.message || '请检查配置后重试',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 删除模型 - 打开确认对话框
  const handleDeleteModel = (model: ModelConfig) => {
    setDeleteModel(model);
  };

  // 确认删除模型
  const confirmDeleteModel = async () => {
    if (!deleteModel) return;

    setIsDeleting(true);
    try {
      const response = await window.electronAPI?.modelDelete?.(deleteModel.id);
      if (response?.success) {
        setModels((prev) => prev.filter((m) => m.id !== deleteModel.id));
        toast({
          title: '删除成功',
          description: `模型 "${deleteModel.name}" 已删除`,
        });
      }
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteModel(null);
    }
  };

  // 切换模型启用状态
  const handleToggleEnabled = async (model: ModelConfig) => {
    try {
      const newEnabled = !model.enabled;
      const response = await window.electronAPI.modelToggle?.(model.id, newEnabled);
      if (response?.success) {
        setModels((prev) =>
          prev.map((m) => (m.id === model.id ? response.data : m))
        );
      }
    } catch (error: any) {
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">模型配置</h1>
            <p className="text-muted-foreground mt-1">
              自定义创建和管理 AI 模型配置
            </p>
          </div>
          <Button onClick={() => handleCreateModel()}>
            <Plus className="mr-2 h-4 w-4" />
            添加模型
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {models.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">暂无模型配置</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              点击下方按钮添加您的第一个 AI 模型配置
            </p>
            <Button onClick={() => handleCreateModel()}>
              <Plus className="mr-2 h-4 w-4" />
              添加模型
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <Card
                key={model.id}
                className={`hover:shadow-lg transition-shadow ${
                  model.enabled ? 'border-green-500' : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <span className="text-xl">🤖</span>
                      </div>
                      <div>
                        <CardTitle className="text-base">{model.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {model.baseUrl || '未配置 API 地址'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* 功能标签 */}
                  <div className="mb-4 flex flex-wrap gap-1">
                    {model.enableStreaming && (
                      <Badge variant="outline" className="text-xs">
                        📡 流式输出
                      </Badge>
                    )}
                    {model.enableMultiTurn && (
                      <Badge variant="outline" className="text-xs">
                        💬 多轮对话
                      </Badge>
                    )}
                    {model.enableThinking && (
                      <Badge variant="outline" className="text-xs">
                        🧠 深度思考
                      </Badge>
                    )}
                    {model.enableWebSearch && (
                      <Badge variant="outline" className="text-xs">
                        🔍 联网搜索
                      </Badge>
                    )}
                    {model.enableWebScraping && (
                      <Badge variant="outline" className="text-xs">
                        🕸️ 网页爬取
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditModel(model)}
                    >
                      <Settings size={14} className="mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant={model.enabled ? 'secondary' : 'default'}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggleEnabled(model)}
                    >
                      {model.enabled ? '禁用' : '启用'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteModel(model)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 编辑/创建弹窗 */}
      <ModelConfigModal
        isOpen={!!editingModel}
        onClose={() => setEditingModel(null)}
        onSave={handleSaveModel}
        modelConfig={editingModel}
        isSaving={isSaving}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteModel} onOpenChange={() => setDeleteModel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              确认删除
            </AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除模型 <span className="font-medium text-foreground">"{deleteModel?.name}"</span> 吗？
              此操作无法撤销，该模型的所有配置将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteModel}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
