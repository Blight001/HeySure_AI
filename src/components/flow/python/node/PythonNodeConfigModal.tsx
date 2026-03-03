/**
 * HeySure AI - Python 节点配置弹窗组件
 * 用于导入 Python 文件并配置节点：
 * - Python 文件选择和导入
 * - 函数选择和配置
 * - 输入/输出变量映射
 * - 执行模式设置（统一输入/独立输入）
 * - 节点测试运行
 * - 节点保存
 */
/**
 * Python节点配置弹窗
 * 用于导入Python文件并配置节点
 */

import { useState, useEffect } from 'react';
import {
  X, FileCode, AlertCircle,
  ChevronDown, ChevronUp, Save, FolderOpen, Play, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface PythonNodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: PythonScriptConfig) => void;
  editConfig?: PythonScriptConfig | null;
}

export function PythonNodeConfigModal({
  isOpen,
  onClose,
  onSave,
  editConfig
}: PythonNodeConfigModalProps) {
  // 基础信息
  const [scriptName, setScriptName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PythonComponentCategory>('custom');
  const [sourceFilePath, setSourceFilePath] = useState('');

  // 测试功能状态
  const [testInputs, setTestInputs] = useState<Record<string, Record<string, any>>>({});
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean; success?: boolean; result?: any; error?: string }>>({});

  const handleTestInputChange = (funcName: string, paramName: string, value: string) => {
    setTestInputs(prev => ({
      ...prev,
      [funcName]: {
        ...(prev[funcName] || {}),
        [paramName]: value
      }
    }));
  };

  const runTest = async (funcName: string) => {
    const func = analysis?.functions.find(f => f.name === funcName);
    if (!func) return;

    setTestResults(prev => ({ ...prev, [funcName]: { loading: true } }));
    
    try {
      // 准备输入参数
      const inputs = testInputs[funcName] || {};
      
      // 尝试转换输入值类型
      const processedInputs: Record<string, any> = {};
      Object.entries(inputs).forEach(([key, val]) => {
          // 简单的类型推断
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
                  // 尝试解析JSON（如果是对象或数组）
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

      console.log('Running test:', { sourceFilePath, funcName, processedInputs });
      const result = await window.electronAPI.pythonExecute({
          filePath: sourceFilePath,
          functionName: funcName,
          inputs: processedInputs,
          config: config
      });
      console.log('Test result:', result);
      
      setTestResults(prev => ({ 
          ...prev, 
          [funcName]: { 
              loading: false, 
              success: result.success, 
              result: result.output, 
              error: result.error 
          } 
      }));
    } catch (e: any) {
      console.error('Test error:', e);
      setTestResults(prev => ({ 
          ...prev, 
          [funcName]: { 
              loading: false, 
              success: false, 
              error: e.message 
          } 
      }));
    }
  };
  const [savedFilePath, setSavedFilePath] = useState('');
  const [analysis, setAnalysis] = useState<PythonFileAnalysis | null>(null);
  const [selectedFunctions, setSelectedFunctions] = useState<PythonFunctionInfo[]>([]);
  const [config, setConfig] = useState({ ...defaultPythonConfig });
  const [aiControlEnabled, setAiControlEnabled] = useState(true);

  // UI状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFuncs, setExpandedFuncs] = useState<Set<string>>(new Set());
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // 初始化编辑模式
  useEffect(() => {
    if (editConfig) {
      setScriptName(editConfig.name);
      setDescription(editConfig.description);
      setCategory(editConfig.category);
      setSavedFilePath(editConfig.savedPath);
      setSelectedFunctions(editConfig.functions);
      setConfig(editConfig.componentConfig);
    } else {
      resetForm();
    }
  }, [editConfig, isOpen]);

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
  };

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

    console.log('=== analyzeFile 开始 ===');
    console.log('原始路径:', filePath);
    console.log('scriptId:', scriptId);

    try {
      // 读取文件内容进行分析（不立即复制）
      const readResult = await pythonRegistry.readPythonFile(filePath);

      console.log('readResult:', readResult);

      if (!readResult.success || !readResult.content) {
        throw new Error(readResult.error || '读取文件失败');
      }

      // 暂不设置savedFilePath，等待保存时再复制
      // setSavedFilePath(copyResult.savedPath || '');

      const content = readResult.content;
      const contentSource = 'file';

      // 分析文件内容
      const analysisResult = pythonRegistry.analyzePythonContent(content, filePath);
      analysisResult.contentSource = contentSource;
      setAnalysis(analysisResult);
      setDescription(analysisResult.overallDescription);

      // 如果分析结果中包含脚本名称，则使用它
      if (analysisResult.scriptName) {
        setScriptName(analysisResult.scriptName);
      }

      // 设置调试信息
      setDebugInfo(`✅ 成功读取文件 | 检测到 ${analysisResult.functions.length} 个函数`);

      console.log('=== analyzeFile 结束 ===');

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

  // 切换函数选择
  const toggleFunctionSelection = (func: PythonFunctionInfo) => {
    setSelectedFunctions(prev => {
      const exists = prev.find(f => f.name === func.name);
      if (exists) {
        return prev.filter(f => f.name !== func.name);
      }
      return [...prev, func];
    });
  };

  // 更新函数自定义名称
  const updateFunctionLabel = (funcName: string, label: string) => {
    if (analysis) {
      setAnalysis({
        ...analysis,
        functions: analysis.functions.map(f => 
          f.name === funcName ? { ...f, label } : f
        )
      });
    }

    setSelectedFunctions(prev => 
      prev.map(f => f.name === funcName ? { ...f, label } : f)
    );
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

  // 保存配置
  const handleSave = async () => {
    if (!scriptName.trim()) {
      setError('请输入脚本名称');
      return;
    }

    if (selectedFunctions.length === 0) {
      setError('请至少选择一个函数');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const scriptId = editConfig?.id || `script_${Date.now()}`;
      
      // 确定最终保存路径
      let finalSavedPath = savedFilePath;
      
      // 如果用户选择了新文件，复制到mode文件夹
      if (sourceFilePath) {
        console.log('保存时复制文件:', sourceFilePath);
        const copyResult = await pythonRegistry.copyScriptToModeFolder(sourceFilePath, scriptId);
        if (!copyResult.success) {
          throw new Error(copyResult.error || '保存脚本文件失败');
        }
        finalSavedPath = copyResult.savedPath || '';
      }
      
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
        createdAt: editConfig?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      // 保存到注册表
      await pythonRegistry.saveScriptConfig(scriptConfig);
      await pythonRegistry.refreshScriptComponents();

      // 更新main.py添加导入（仅在新添加时）
      if (!editConfig) {
        await pythonRegistry.addImportToMainPy(scriptConfig);
      }

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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-background w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            <h2 className="text-lg font-semibold">
              {editConfig ? '编辑Python节点' : '添加Python节点'}
            </h2>
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

                <div className="col-span-2">
                  <Label>Python文件</Label>
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
                <div className="space-y-2">
                  {analysis.functions.map(func => {
                    const isSelected = selectedFunctions.some(f => f.name === func.name);
                    const isExpanded = expandedFuncs.has(func.name);

                    return (
                      <Card key={func.name} className={isSelected ? 'border-primary' : ''}>
                        <CardHeader
                          className="py-3 px-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleFuncExpand(func.name)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFunctionSelection(func)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded"
                                aria-label={`选择函数 ${func.name}`}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{func.label || func.name}</span>
                                  {func.label && (
                                    <span className="text-xs text-muted-foreground">({func.name})</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {func.description || '无描述'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        {isExpanded && (
                          <CardContent className="pt-0 pb-4 px-4 border-t">
                            {/* 自定义名称 */}
                            <div className="mb-3 mt-3">
                              <Label className="text-xs mb-1.5 block">自定义显示名称 (可选)</Label>
                              <Input
                                value={func.label || ''}
                                onChange={(e) => updateFunctionLabel(func.name, e.target.value)}
                                placeholder={`默认显示: ${func.name}`}
                                className="h-8 text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            {/* 返回值信息 */}
                            <div className="mb-3 p-2 bg-muted rounded">
                              <span className="text-xs font-medium">返回值: </span>
                              <code className="text-xs">{func.returns.type}</code>
                              <span className="text-xs text-muted-foreground ml-1">
                                - {func.returns.description}
                              </span>
                            </div>

                            {/* 参数列表 */}
                            {func.parameters.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">参数:</p>
                                {func.parameters.map(param => (
                                  <div key={param.name} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                                    <code className="text-xs bg-background px-1.5 py-0.5 rounded">
                                      {param.name}
                                    </code>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <code className="text-xs text-muted-foreground">
                                          {param.type}
                                        </code>
                                        {param.required && (
                                          <span className="text-xs text-destructive">必需</span>
                                        )}
                                        {param.defaultValue !== undefined && (
                                          <span className="text-xs text-muted-foreground">
                                            = {String(param.defaultValue)}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {param.description}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">无参数</p>
                            )}

                            {/* 函数测试区域 */}
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center justify-between mb-3">
                                <Label className="text-xs font-medium">函数测试</Label>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    runTest(func.name);
                                  }}
                                  disabled={testResults[func.name]?.loading}
                                >
                                  {testResults[func.name]?.loading ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Play className="w-3 h-3 mr-1" />
                                  )}
                                  运行测试
                                </Button>
                              </div>

                              <div className="space-y-3 bg-muted/30 p-3 rounded-md">
                                {/* 测试参数输入 */}
                                {func.parameters.length > 0 ? (
                                  <div className="space-y-2">
                                    {func.parameters.map(param => (
                                      <div key={param.name} className="grid grid-cols-3 gap-2 items-center">
                                         <Label className="text-xs text-muted-foreground text-right truncate" title={param.name}>
                                            {param.name}
                                            {param.required && <span className="text-destructive">*</span>}
                                         </Label>
                                         <div className="col-span-2">
                                           <Input 
                                             className="h-7 text-xs"
                                             placeholder={`输入 ${param.type} 值`}
                                             value={testInputs[func.name]?.[param.name] || ''}
                                             onChange={(e) => handleTestInputChange(func.name, param.name, e.target.value)}
                                             onClick={(e) => e.stopPropagation()}
                                           />
                                         </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-1">无参数，直接运行测试</p>
                                )}

                                {/* 测试结果 */}
                                {testResults[func.name] && (
                                  <div className={`mt-3 p-2 rounded text-xs border ${
                                    testResults[func.name].success 
                                      ? 'bg-green-50/50 border-green-200 text-green-800' 
                                      : 'bg-red-50/50 border-red-200 text-red-800'
                                  }`}>
                                    <div className="font-medium mb-1">
                                      {testResults[func.name].success ? '执行成功' : '执行失败'}
                                    </div>
                                    <pre className="whitespace-pre-wrap break-all overflow-auto max-h-32">
                                      {testResults[func.name].success 
                                        ? (typeof testResults[func.name].result === 'object' 
                                            ? JSON.stringify(testResults[func.name].result, null, 2) 
                                            : String(testResults[func.name].result))
                                        : testResults[func.name].error
                                      }
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
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

export default PythonNodeConfigModal;

