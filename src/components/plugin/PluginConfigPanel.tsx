/**
 * HeySure AI - 插件配置面板组件
 * 管理应用插件的配置：
 * - 插件列表展示
 * - 插件启用/禁用
 * - 插件配置编辑
 * - 插件安装/卸载
 * - 插件信息展示
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Settings, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface PluginConfigPanelProps {
  pluginId: string;
  pluginName: string;
  pluginDescription: string;
  pluginIcon: string;
  settings: PluginSetting[];
  config: Record<string, any>;
  models: ModelInfo[];
  status: PluginStatus;
  onSave: (config: Record<string, any>) => Promise<void>;
  onTest: () => Promise<{ success: boolean; latency?: number; error?: string }>;
  onClose: () => void;
}

interface PluginSetting {
  key: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'textarea';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  maxOutput: number;
  streaming: boolean;
  vision: boolean;
  functionCall: boolean;
}

type PluginStatus = 'idle' | 'loading' | 'ready' | 'error' | 'updating';

export function PluginConfigPanel({
  pluginId,
  pluginName,
  pluginDescription,
  pluginIcon,
  settings,
  config,
  models,
  status,
  onSave,
  onTest,
  onClose,
}: PluginConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latency?: number; error?: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (key: string, value: any) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localConfig);
      toast({
        title: '保存成功',
        description: `${pluginName} 配置已保存`,
        variant: 'success',
      });
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

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTest();
      setTestResult(result);
      if (result.success) {
        toast({
          title: '连接成功',
          description: `延迟: ${result.latency}ms`,
          variant: 'success',
        });
      } else {
        toast({
          title: '连接失败',
          description: result.error || '请检查配置后重试',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
      toast({
        title: '测试失败',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const renderSettingInput = (setting: PluginSetting) => {
    const value = localConfig[setting.key] ?? setting.defaultValue;
    const showPassword = showPasswords[setting.key] || false;

    switch (setting.type) {
      case 'password':
        return (
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={setting.placeholder}
              value={value || ''}
              onChange={(e) => handleChange(setting.key, e.target.value)}
              required={setting.required}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPasswords((prev) => ({ ...prev, [setting.key]: !prev[setting.key] }))}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={(v) => handleChange(setting.key, v)}>
            <SelectTrigger>
              <SelectValue placeholder={setting.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'boolean':
        return (
          <Switch
            checked={!!value}
            onCheckedChange={(checked) => handleChange(setting.key, checked)}
          />
        );

      case 'textarea':
        return (
          <textarea
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={setting.placeholder}
            value={value || ''}
            onChange={(e) => handleChange(setting.key, e.target.value)}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={setting.placeholder}
            value={value || ''}
            onChange={(e) => handleChange(setting.key, Number(e.target.value))}
          />
        );

      default:
        return (
          <Input
            type="text"
            placeholder={setting.placeholder}
            value={value || ''}
            onChange={(e) => handleChange(setting.key, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
              {pluginIcon}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{pluginName}</h2>
              <p className="text-sm text-muted-foreground">{pluginDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={status === 'ready' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}>
              {status === 'ready' && <CheckCircle className="mr-1 h-3 w-3" />}
              {status === 'error' && <AlertCircle className="mr-1 h-3 w-3" />}
              {status === 'loading' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {status === 'idle' && '未配置'}
              {status === 'ready' && '已就绪'}
              {status === 'error' && '错误'}
              {status === 'loading' && '加载中'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* API 配置 */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              API 配置
            </h3>
            {settings.map((setting) => (
              <div key={setting.key} className="space-y-2">
                <Label htmlFor={setting.key}>
                  {setting.label}
                  {setting.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderSettingInput(setting)}
                {setting.description && (
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                )}
              </div>
            ))}
          </div>

          {/* 模型配置 */}
          {models.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                可用模型
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {models.map((model) => (
                  <Card key={model.id} className="cursor-pointer hover:border-primary">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{model.name}</CardTitle>
                      <CardDescription className="text-xs">
                        上下文: {model.contextLength.toLocaleString()} tokens
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1">
                        {model.streaming && (
                          <Badge variant="outline" className="text-xs">
                            流式
                          </Badge>
                        )}
                        {model.vision && (
                          <Badge variant="outline" className="text-xs">
                            视觉
                          </Badge>
                        )}
                        {model.functionCall && (
                          <Badge variant="outline" className="text-xs">
                            函数调用
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 测试结果 */}
          {testResult && (
            <div
              className={`rounded-lg p-4 ${
                testResult.success
                  ? 'bg-green/10 text-green'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="font-medium">
                  {testResult.success
                    ? `连接成功 (延迟: ${testResult.latency}ms)`
                    : `连接失败: ${testResult.error}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t p-6">
          <Button variant="outline" onClick={handleTest} disabled={isTesting}>
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                测试中...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                测试连接
              </>
            )}
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

