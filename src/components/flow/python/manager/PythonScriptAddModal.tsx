/**
 * HeySure AI - Python 脚本添加弹窗组件
 * 用于添加新的 Python 脚本：
 * - 新建空白脚本
 * - 从文件导入脚本
 * - 脚本基本配置（名称、路径）
 * - 脚本验证
 */
/**
 * 脚本添加配置弹窗
 * 用于添加和配置Python脚本
 */

import { useState, useEffect } from 'react';
import {
  X, FileCode, AlertCircle,
  Save, FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  pythonRegistry,
  defaultPythonConfig,
  defaultControlLimits
} from '../core/PythonRegistry';
import type {
  PythonScriptConfig,
  PythonFunctionInfo,
  PythonFileAnalysis,
  PythonComponentCategory
} from '@/types/flow';
import { PythonFunctionList } from './PythonFunctionList';

interface PythonScriptAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: PythonScriptConfig) => void;
}

export function PythonScriptAddModal({
  isOpen,
  onClose,
  onSave
}: PythonScriptAddModalProps) {
  // 基础信息
  const [scriptName, setScriptName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PythonComponentCategory>('custom');
  const [sourceFilePath, setSourceFilePath] = useState('');
  const [savedFilePath, setSavedFilePath] = useState('');
  const [analysis, setAnalysis] = useState<PythonFileAnalysis | null>(null);
  const [selectedFunctions, setSelectedFunctions] = useState<PythonFunctionInfo[]>([]);
  const [config, setConfig] = useState({ ...defaultPythonConfig });
  const [aiControlEnabled, setAiControlEnabled] = useState(true);

  // 测试功能状态
  const [testInputs, setTestInputs] = useState<Record<string, Record<string, any>>>({});
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean; success?: boolean; result?: any; error?: string }>>({});

  // UI状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFuncs, setExpandedFuncs] = useState<Set<string>>(new Set());
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // 重置表单
  const resetForm = () => {
    setScriptName('');
    setDescription('');
    setCategory('custom');
    setSourceFilePath('');
    setSavedFilePath('');
    setAnalysis(null);
    setSelectedFunctions([]);
    setConfig({ ...defaultPythonConfig });
    setError(null);
    setExpandedFuncs(new Set());
    setTestInputs({});
    setTestResults({});
  };

  // 打开弹窗时重置
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // 选择Python文件
  const handleSelectFile = async () => {
    try {
      if (window.dialog?.showOpenDialog) {
        const result = await window.dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            { name: 'Python Files', extensions: ['py'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          setSourceFilePath(filePath);
          setScriptName(filePath.split(/[/\\]/).pop()?.replace('.py', '') || '新脚本');

          // 生成脚本ID（用于mode目录中的文件名）
          const scriptId = `script_${Date.now()}`;

          // 分析文件
          await analyzeFile(filePath, scriptId);
        }
      } else {
        // 模拟环境
        setSourceFilePath('C:/mock/path/script.py');
        setScriptName('新脚本');
        setError('请在Electron环境中使用文件选择器');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '选择文件失败');
    }
  };

  // 分析Python文件
  const analyzeFile = async (filePath: string, scriptId: string) => {
    setIsAnalyzing(true);
    setError(null);
    setDebugInfo(null);

    try {
      // 读取文件内容进行分析（不立即复制）
      const readResult = await pythonRegistry.readPythonFile(filePath);

      if (!readResult.success || !readResult.content) {
        throw new Error(readResult.error || '读取文件失败');
      }

      const content = readResult.content;

      // 分析文件内容
      const analysisResult = pythonRegistry.analyzePythonContent(content, filePath);
      analysisResult.contentSource = 'file';
      setAnalysis(analysisResult);
      setDescription(analysisResult.overallDescription);

      // 如果分析结果中包含脚本名称，则使用它
      if (analysisResult.scriptName) {
        setScriptName(analysisResult.scriptName);
      }

      // 设置调试信息
      setDebugInfo(`成功读取文件 | 检测到 ${analysisResult.functions.length} 个函数`);

      // 默认选择所有函数
      setSelectedFunctions(analysisResult.functions);

      // 默认展开第一个函数
      if (analysisResult.functions.length > 0) {
        setExpandedFuncs(new Set([analysisResult.functions[0].name]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析文件失败');
      console.error('分析文件错误:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 展开/折叠函数详情
  const toggleFuncExpand = (funcName: string) => {
    setExpandedFuncs(prev => {
      const next = new Set(prev);
      if (next.has(funcName)) {
        next.delete(funcName);
      } else {
        next.add(funcName);
      }
      return next;
    });
  };

  // 处理测试输入变化
  const handleTestInputChange = (funcName: string, paramName: string, value: string) => {
    setTestInputs(prev => ({
      ...prev,
      [funcName]: {
        ...(prev[funcName] || {}),
        [paramName]: value
      }
    }));
  };

  // 运行函数测试
  const runTest = async (funcName: string) => {
    const func = analysis?.functions.find(f => f.name === funcName);
    if (!func || !sourceFilePath) return;

    setTestResults(prev => ({
      ...prev,
      [funcName]: { loading: true }
    }));

    try {
      const inputs = testInputs[funcName] || {};

      // 转换输入值类型
      const processedInputs: Record<string, any> = {};
      Object.entries(inputs).forEach(([key, val]) => {
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (!isNaN(Number(trimmed)) && trimmed !== '') {
            processedInputs[key] = Number(trimmed);
          } else if (trimmed.toLowerCase() === 'true') {
            processedInputs[key] = true;
          } else if (trimmed.toLowerCase() === 'false') {
            processedInputs[key] = false;
          } else {
            try {
              if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                processedInputs[key] = JSON.parse(trimmed);
              } else {
                processedInputs[key] = val;
              }
            } catch {
              processedInputs[key] = val;
            }
          }
        } else {
          processedInputs[key] = val;
        }
      });

      const result = await window.electronAPI.pythonExecute({
        filePath: sourceFilePath,
        functionName: funcName,
        inputs: processedInputs,
        config: config
      });

      setTestResults(prev => ({
        ...prev,
        [funcName]: {
          loading: false,
          success: result.success,
          result: result.output,
          error: result.error
        }
      }));
    } catch (err: any) {
      console.error('Test error:', err);
      setTestResults(prev => ({
        ...prev,
        [funcName]: {
          loading: false,
          success: false,
          error: err.message
        }
      }));
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!scriptName.trim()) {
      setError('请输入脚本名称');
      return;
    }

    if (!sourceFilePath) {
      setError('请选择Python文件');
      return;
    }

    if (selectedFunctions.length === 0) {
      setError('请至少选择一个函数');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 生成脚本ID
      const scriptId = `script_${Date.now()}`;

      // 复制文件到mode文件夹
      const copyResult = await pythonRegistry.copyScriptToModeFolder(sourceFilePath, scriptId);
      if (!copyResult.success) {
        throw new Error(copyResult.error || '保存脚本文件失败');
      }

      const finalSavedPath = copyResult.savedPath || '';
      if (!finalSavedPath) {
        throw new Error('未找到有效的脚本文件路径');
      }

      const fileName = finalSavedPath.split(/[/\\]/).pop() || 'script.py';

      const scriptConfig: PythonScriptConfig = {
        id: scriptId,
        name: scriptName,
        fileName: fileName,
        savedPath: finalSavedPath,
        category,
        description,
        functions: selectedFunctions,
        componentConfig: config,
        aiControl: aiControlEnabled ? [{
          id: `rule_${Date.now()}`,
          name: `${scriptName} 自动规则`,
          description: `自动为 ${scriptName} 创建的AI控制规则`,
          priority: 5,
          enabled: true,
          triggers: [{ type: 'keyword', pattern: scriptName }],
          inputRules: [],
          outputRules: [],
          limits: { ...defaultControlLimits },
        }] : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 保存到注册表
      await pythonRegistry.saveScriptConfig(scriptConfig);
      await pythonRegistry.refreshScriptComponents();

      // 更新main.py添加导入
      await pythonRegistry.addImportToMainPy(scriptConfig);

      onSave(scriptConfig);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存配置失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            <h2 className="text-lg font-semibold">添加脚本</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList>
              <TabsTrigger value="basic">基础信息</TabsTrigger>
              <TabsTrigger value="functions">函数选择 ({selectedFunctions.length})</TabsTrigger>
              <TabsTrigger value="config">执行配置</TabsTrigger>
            </TabsList>

            {/* 基础信息 */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Python文件选择 - 放在第一行 */}
                <div className="col-span-2">
                  <Label>Python文件 *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={sourceFilePath}
                      readOnly
                      placeholder="选择Python文件"
                      className="flex-1"
                    />
                    <Button onClick={handleSelectFile} disabled={isAnalyzing}>
                      <FolderOpen className="w-4 h-4 mr-2" />
                      {isAnalyzing ? '分析中...' : '选择文件'}
                    </Button>
                  </div>
                  {debugInfo && (
                    <p className={`text-xs mt-1 ${debugInfo.includes('⚠️') ? 'text-amber-500' : 'text-green-500'}`}>
                      {debugInfo}
                    </p>
                  )}
                </div>

                <div className="col-span-2">
                  <Label>脚本名称 *</Label>
                  <Input
                    value={scriptName}
                    onChange={(e) => setScriptName(e.target.value)}
                    placeholder="输入脚本名称"
                  />
                </div>

                <div className="col-span-2">
                  <Label>描述</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="输入脚本描述"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>分类</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as PythonComponentCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data_processing">数据处理</SelectItem>
                      <SelectItem value="text_analysis">文本分析</SelectItem>
                      <SelectItem value="web_search">网络搜索</SelectItem>
                      <SelectItem value="file_operation">文件操作</SelectItem>
                      <SelectItem value="math_calculator">数学计算</SelectItem>
                      <SelectItem value="ai_tool">AI工具</SelectItem>
                      <SelectItem value="custom">自定义</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>AI控制</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={aiControlEnabled}
                      onCheckedChange={setAiControlEnabled}
                    />
                    <span className="text-sm text-muted-foreground">
                      {aiControlEnabled ? '启用' : '禁用'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 函数选择 */}
            <TabsContent value="functions" className="space-y-4">
              {!analysis ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileCode className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>请先选择一个Python文件</p>
                </div>
              ) : (
                <PythonFunctionList
                  functions={analysis.functions}
                  selectedFunctionNames={new Set(selectedFunctions.map(func => func.name))}
                  expandedFunctionNames={expandedFuncs}
                  onToggleSelect={(func, selected) => {
                    setSelectedFunctions(prev => {
                      const exists = prev.some(f => f.name === func.name);
                      if (selected && !exists) return [...prev, func];
                      if (!selected && exists) return prev.filter(f => f.name !== func.name);
                      return prev;
                    });
                  }}
                  onToggleExpand={toggleFuncExpand}
                  testInputs={testInputs}
                  testResults={testResults}
                  onTestInputChange={handleTestInputChange}
                  onRunTest={runTest}
                />
              )}
            </TabsContent>

            {/* 执行配置 */}
            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>超时时间 (秒)</Label>
                  <Input
                    type="number"
                    value={config.timeout}
                    onChange={(e) => setConfig({ ...config, timeout: Number(e.target.value) })}
                    min={1}
                    max={300}
                  />
                </div>

                <div>
                  <Label>内存限制 (MB)</Label>
                  <Input
                    type="number"
                    value={config.memoryLimit || 256}
                    onChange={(e) => setConfig({ ...config, memoryLimit: Number(e.target.value) })}
                    min={64}
                    max={1024}
                  />
                </div>

                <div className="col-span-2">
                  <Label className="flex items-center gap-2">
                    <Switch
                      checked={config.requireApproval}
                      onCheckedChange={(checked) => setConfig({ ...config, requireApproval: checked })}
                    />
                    需要用户确认执行
                  </Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving || selectedFunctions.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PythonScriptAddModal;
