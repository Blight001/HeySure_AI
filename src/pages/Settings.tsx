/**
 * HeySure AI - 设置页面
 * 负责应用设置管理，包括：
 * - 通用设置（语言、自动保存、控制台）
 * - 外观设置（主题、字体大小）
 * - 账户设置（预留）
 * - 隐私设置（预留）
 * - AI模型配置列表展示
 * - Token使用统计展示
 */
import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, User, Palette, Shield, Terminal, Bot, Coins, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSettingsStore, useMessageStore, useDialogStore } from '@/stores';
import { useToast } from '@/hooks/use-toast';
import { applyTheme, applyFontSize } from '@/utils/helpers';
import { ModelService } from '@/services/apiService';

type Theme = 'light' | 'dark' | 'system';

const tabs = [
  { id: 'general', label: '通用', icon: SettingsIcon },
  { id: 'appearance', label: '外观', icon: Palette },
  { id: 'account', label: '账户', icon: User },
  { id: 'privacy', label: '隐私', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // 模型和Token统计状态
  const [models, setModels] = useState<any[]>([]);
  const [globalTokenStats, setGlobalTokenStats] = useState({
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    dialogCount: 0,
    messageCount: 0,
  });

  // 从 store 获取设置
  const {
    language,
    autoSave,
    theme,
    fontSize,
    temperature,
    maxTokens,
    showConsole,
    setLanguage,
    setAutoSave,
    setTheme,
    setFontSize,
    setShowConsole,
  } = useSettingsStore();

  // 确保在客户端渲染并初始化主题
  useEffect(() => {
    setIsClient(true);
    // 应用保存的主题
    applyTheme(theme);

    // 设置系统主题监听（仅当主题为 system 时）
    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
      if (mediaQuery) {
        const handleChange = () => {
          applyTheme('system');
        };
        mediaQuery.addEventListener?.('change', handleChange);
        return () => {
          mediaQuery.removeEventListener?.('change', handleChange);
        };
      }
    }
    return () => {};
  }, [theme]);

  // 初始化字体大小
  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  // 加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        const list = await ModelService.list();
        setModels(Object.values(list));
      } catch (error) {
        console.error('加载模型列表失败:', error);
      }
    };
    loadModels();
  }, []);

  // 计算全局Token统计
  useEffect(() => {
    const calculateGlobalTokenStats = () => {
      const { messages } = useMessageStore.getState();
      const { dialogs } = useDialogStore.getState();

      let totalTokens = 0;
      let promptTokens = 0;
      let completionTokens = 0;

      messages.forEach((msg) => {
        if (msg.metadata?.tokenUsage) {
          totalTokens += msg.metadata.tokenUsage.totalTokens;
          promptTokens += msg.metadata.tokenUsage.promptTokens;
          completionTokens += msg.metadata.tokenUsage.completionTokens;
        }
      });

      setGlobalTokenStats({
        totalTokens,
        promptTokens,
        completionTokens,
        dialogCount: Array.isArray(dialogs) ? dialogs.length : 0,
        messageCount: messages.length,
      });
    };

    calculateGlobalTokenStats();
  }, []);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    // 立即应用到 DOM
    applyTheme(newTheme);

    toast({
      title: '主题已切换',
      description: newTheme === 'system'
        ? '将根据系统设置自动切换主题'
        : `已切换到${newTheme === 'light' ? '亮色' : '暗色'}主题`,
    });
  }, [setTheme, toast]);

  // 切换控制台显示
  const toggleConsole = useCallback(() => {
    window.ipcRenderer.devTools.toggle();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 通过 IPC 保存所有设置到磁盘
      await window.ipcRenderer.settings.set({ key: 'theme', value: theme });
      await window.ipcRenderer.settings.set({ key: 'language', value: language });
      await window.ipcRenderer.settings.set({ key: 'fontSize', value: fontSize });
      await window.ipcRenderer.settings.set({ key: 'autoSave', value: autoSave });
      await window.ipcRenderer.settings.set({ key: 'temperature', value: temperature });
      await window.ipcRenderer.settings.set({ key: 'maxTokens', value: maxTokens });
      await window.ipcRenderer.settings.set({ key: 'showConsole', value: showConsole });

      toast({
        title: '设置已保存',
        description: '您的更改已成功保存到磁盘',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: '保存失败',
        description: '无法保存设置，请重试',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 如果还未在客户端渲染，显示加载状态
  if (!isClient) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">设置</h2>
        </div>
        <nav className="p-2 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-medium">通用设置</h3>
              <p className="text-sm text-muted-foreground">
                配置应用程序的基本行为
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">语言</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  title="选择语言"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en">English</option>
                </select>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">自动保存</CardTitle>
                <CardDescription>
                  自动保存对话历史和设置
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">启用自动保存</span>
                </label>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">控制台</CardTitle>
                <CardDescription>
                  控制开发者工具的显示与隐藏
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showConsole}
                      onChange={(e) => setShowConsole(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">启动时显示控制台</span>
                  </label>
                </div>
                <Button
                  variant="outline"
                  onClick={toggleConsole}
                  className="w-full"
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  切换控制台显示
                </Button>
                <p className="text-xs text-muted-foreground">
                  提示：也可以使用快捷键 Ctrl+Shift+I 打开/关闭控制台
                </p>
              </CardContent>
            </Card>

            {/* AI模型配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI 模型配置
                </CardTitle>
                <CardDescription>
                  当前已配置的 AI 模型列表
                </CardDescription>
              </CardHeader>
              <CardContent>
                {models.length > 0 ? (
                  <div className="space-y-3">
                    {models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{model.name}</div>
                            <div className="text-xs text-muted-foreground">{model.model}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              model.enabled
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {model.enabled ? '已启用' : '已禁用'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无配置的模型</p>
                    <p className="text-xs mt-1">请在"插件配置"页面添加自定义模型</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Token 使用统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Token 使用统计
                </CardTitle>
                <CardDescription>
                  全局 Token 使用情况概览
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-primary/5 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">总 Token</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {globalTokenStats.totalTokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">对话数</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {globalTokenStats.dialogCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <div className="text-xs text-muted-foreground mb-1">输入 Token</div>
                    <div className="font-mono text-lg">
                      {globalTokenStats.promptTokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <div className="text-xs text-muted-foreground mb-1">输出 Token</div>
                    <div className="font-mono text-lg">
                      {globalTokenStats.completionTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  共 {globalTokenStats.messageCount} 条消息
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === 'appearance' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-medium">外观设置</h3>
              <p className="text-sm text-muted-foreground">
                自定义应用程序的外观
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">主题</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {[
                    { value: 'light' as Theme, label: '亮色', icon: '☀️' },
                    { value: 'dark' as Theme, label: '暗色', icon: '🌙' },
                    { value: 'system' as Theme, label: '跟随系统', icon: '💻' }
                  ].map((themeOption) => (
                    <button
                      key={themeOption.value}
                      onClick={() => handleThemeChange(themeOption.value)}
                      className={`flex-1 rounded-lg border-2 p-4 transition-colors ${
                        theme === themeOption.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-center">
                        <span className="text-2xl">{themeOption.icon}</span>
                        <p className="mt-2 text-sm capitalize">{themeOption.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">字体大小</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="range"
                  min="12"
                  max="20"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full"
                  aria-label="字体大小"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  当前: {fontSize}px
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        {(activeTab === 'account' || activeTab === 'privacy') && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">🔧</div>
              <h3 className="text-lg font-medium">{tabs.find(t => t.id === activeTab)?.label}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                此功能将在后续版本中实现
              </p>
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </main>
    </div>
  );
}
