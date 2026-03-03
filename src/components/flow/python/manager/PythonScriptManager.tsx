/**
 * HeySure AI - Python 脚本管理器组件
 * 管理项目中的 Python 脚本：
 * - 脚本列表展示
 * - 脚本编辑功能
 * - 脚本删除功能
 * - 脚本启用/禁用
 * - 脚本刷新同步
 * - 导入新脚本
 * - 脚本测试运行
 */
import { useState, useEffect } from 'react';
import {
  X, Trash2, RefreshCw, Loader2,
  FileText, Settings, Plus, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  pythonRegistry,
  defaultControlLimits,
  defaultPythonConfig
} from '../core/PythonRegistry';
import type {
  PythonScriptConfig,
  PythonFunctionInfo,
  PythonFileAnalysis,
  PythonComponentCategory,
  PythonComponentConfig
} from '@/types/flow';
import { PythonScriptAddModal } from './PythonScriptAddModal';
import { PythonFunctionList } from './PythonFunctionList';

interface PythonScriptManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function PythonScriptManager({ isOpen, onClose, onUpdate }: PythonScriptManagerProps) {
  const [scripts, setScripts] = useState<PythonScriptConfig[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PythonFileAnalysis | null>(null);
  const [expandedFuncs, setExpandedFuncs] = useState<Set<string>>(new Set());
  const [addModalOpen, setAddModalOpen] = useState(false);
  
  // Edit State
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<PythonComponentCategory>('custom');
  const [editConfig, setEditConfig] = useState<PythonComponentConfig>({ ...defaultPythonConfig });
  const [editAiControl, setEditAiControl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteScriptId, setDeleteScriptId] = useState<string | null>(null);

  // Test state
  const [testInputs, setTestInputs] = useState<Record<string, Record<string, any>>>({});
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean; success?: boolean; result?: any; error?: string; logs?: string }>>({});

  useEffect(() => {
    if (isOpen) {
      loadScripts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedScriptId) {
      const script = scripts.find(s => s.id === selectedScriptId);
      if (script) {
        setEditName(script.name);
        setEditDescription(script.description);
        setEditCategory(script.category);
        setEditConfig(script.componentConfig || { ...defaultPythonConfig });
        setEditAiControl(!!(script.aiControl && script.aiControl.length > 0 && script.aiControl[0].enabled));
        analyzeSelectedScript();
      }
    } else {
      setAnalysisResult(null);
    }
  }, [selectedScriptId, scripts]);

  const deleteScript = deleteScriptId ? scripts.find(s => s.id === deleteScriptId) : null;

  const loadScripts = async () => {
    const configs = await pythonRegistry.loadScriptConfigs();
    setScripts(configs);
    if (!selectedScriptId && configs.length > 0) {
      setSelectedScriptId(configs[0].id);
    }
  };

  const analyzeSelectedScript = async () => {
    const script = scripts.find(s => s.id === selectedScriptId);
    if (!script) return;

    setAnalyzing(true);
    try {
      const path = script.savedPath || script.fileName;
      // Read file content first
      const readResult = await pythonRegistry.readPythonFile(path);
      if (readResult.success && readResult.content) {
          const analysis = pythonRegistry.analyzePythonContent(readResult.content, path);
          setAnalysisResult(analysis);
      } else {
          console.warn('Failed to read file for analysis:', readResult.error);
          // Fallback: use existing function list if read fails (though unlikely if file exists)
           setAnalysisResult({
              filePath: path,
              savedPath: path,
              functions: script.functions,
              className: '',
              moduleName: script.name,
              overallDescription: script.description,
              contentSource: 'fallback'
          });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  // 打开添加脚本弹窗
  const handleAddScript = () => {
    setAddModalOpen(true);
  };

  // 添加脚本成功回调
  const handleScriptSaved = async (config: PythonScriptConfig) => {
    await loadScripts();
    setSelectedScriptId(config.id);
    onUpdate();
  };

  const handleToggleFunction = async (func: PythonFunctionInfo, enabled: boolean) => {
    const script = scripts.find(s => s.id === selectedScriptId);
    if (!script) return;

    let newFunctions = [...script.functions];
    if (enabled) {
      // Add function if not exists
      if (!newFunctions.find(f => f.name === func.name)) {
        newFunctions.push(func);
      }
    } else {
      // Remove function
      newFunctions = newFunctions.filter(f => f.name !== func.name);
    }

    const updatedScript = { ...script, functions: newFunctions };
    
    // Optimistic update
    setScripts(scripts.map(s => s.id === script.id ? updatedScript : s));

    // Save
    await pythonRegistry.saveScriptConfig(updatedScript);
    await pythonRegistry.refreshScriptComponents();
    
    // Update main.py imports (addImportToMainPy checks duplicates, so it's safe)
    await pythonRegistry.addImportToMainPy(updatedScript);
    // If removing, we might want to clean up imports, but removeImportFromMainPy removes ALL imports for the script
    // So for now we just add. Unused imports in main.py are harmless.
    
    onUpdate();
  };

  const handleUpdateFunctionLabel = async (funcName: string, label: string) => {
    const script = scripts.find(s => s.id === selectedScriptId);
    if (!script) return;

    // Only update if function is enabled
    const exists = script.functions.find(f => f.name === funcName);
    if (!exists) return;

    const newFunctions = script.functions.map(f => 
      f.name === funcName ? { ...f, label } : f
    );

    const updatedScript = { ...script, functions: newFunctions };
    
    // Optimistic update
    setScripts(scripts.map(s => s.id === script.id ? updatedScript : s));

    // Save
    await pythonRegistry.saveScriptConfig(updatedScript);
    await pythonRegistry.refreshScriptComponents();
  };

  const handleDeleteScript = async (id: string) => {
    const script = scripts.find(s => s.id === id);
    if (script) {
        await pythonRegistry.removeImportFromMainPy(script);
        // Pass savedPath to delete both config and the .py file
        await pythonRegistry.deleteScriptConfig(id, script.savedPath);
    } else {
        await pythonRegistry.deleteScriptConfig(id);
    }
    
    await loadScripts();
    if (selectedScriptId === id) {
      setSelectedScriptId(null);
    }
    onUpdate();
  };

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

  const requestDeleteScript = (id: string) => {
    setDeleteScriptId(id);
  };

  const confirmDeleteScript = async () => {
    if (!deleteScriptId) return;
    await handleDeleteScript(deleteScriptId);
    setDeleteScriptId(null);
  };

  const handleSaveSettings = async () => {
    const script = scripts.find(s => s.id === selectedScriptId);
    if (!script) return;
    
    setIsSaving(true);
    try {
      const updatedScript: PythonScriptConfig = {
        ...script,
        name: editName,
        description: editDescription,
        category: editCategory,
        componentConfig: editConfig,
        aiControl: editAiControl ? (script.aiControl && script.aiControl.length > 0 ? [{
           ...script.aiControl[0],
           enabled: true,
           name: `${editName} 自动规则`,
           triggers: [{ type: 'keyword', pattern: editName }]
        }] : [{
          id: `rule_${Date.now()}`,
          name: `${editName} 自动规则`,
          description: `自动为 ${editName} 创建的AI控制规则`,
          priority: 5,
          enabled: true,
          triggers: [{ type: 'keyword', pattern: editName }],
          inputRules: [],
          outputRules: [],
          limits: { ...defaultControlLimits },
        }]) : (script.aiControl ? script.aiControl.map(r => ({ ...r, enabled: false })) : []),
        updatedAt: Date.now()
      };

      await pythonRegistry.saveScriptConfig(updatedScript);
      await pythonRegistry.refreshScriptComponents();
      
      // Update main.py imports
      await pythonRegistry.addImportToMainPy(updatedScript);
      
      await loadScripts();
      onUpdate();
      
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Test Logic ---
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
    const script = scripts.find(s => s.id === selectedScriptId);
    if (!script || !analysisResult) return;

    const funcInfo = analysisResult.functions.find(f => f.name === funcName);
    if (!funcInfo) return;

    setTestResults(prev => ({
      ...prev,
      [funcName]: { loading: true }
    }));

    try {
      const inputs = testInputs[funcName] || {};
      const processedInputs: Record<string, any> = {};

      // Process inputs based on types
      funcInfo.parameters.forEach(param => {
        const rawValue = inputs[param.name];
        if (rawValue === undefined || rawValue === '') return;

        let value: any = rawValue;
        const type = param.type.toLowerCase();

        if (type.includes('int')) {
          const parsed = parseInt(rawValue);
          // 确保 parseInt 返回有效数字
          if (!isNaN(parsed) && isFinite(parsed)) {
            value = parsed;
          }
        } else if (type.includes('float')) {
          const parsed = parseFloat(rawValue);
          // 确保 parseFloat 返回有效数字
          if (!isNaN(parsed) && isFinite(parsed)) {
            value = parsed;
          }
        } else if (type.includes('bool')) {
          value = rawValue.toLowerCase() === 'true';
        } else if (type.includes('dict') || type.includes('list')) {
          try {
            value = JSON.parse(rawValue);
          } catch {
            // Keep as string if parse fails
          }
        }
        processedInputs[param.name] = value;
      });

      const result = await window.electronAPI.pythonExecute({
        filePath: script.savedPath,
        functionName: funcName,
        inputs: processedInputs,
        config: script.componentConfig
      });

      setTestResults(prev => ({
        ...prev,
        [funcName]: {
          loading: false,
          success: result.success,
          result: result.output,
          error: result.error,
          logs: result.logs
        }
      }));

    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [funcName]: {
          loading: false,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }));
    }
  };

  if (!isOpen) return null;

  const selectedScript = scripts.find(s => s.id === selectedScriptId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background w-full max-w-5xl h-[85vh] rounded-lg shadow-xl flex overflow-hidden">
        
        {/* Sidebar: Script List */}
        <div className="w-64 border-r bg-muted/10 flex flex-col">
          <div className="p-4 border-b font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" />
            脚本管理
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {scripts.map(script => (
                <div
                  key={script.id}
                  onClick={() => setSelectedScriptId(script.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm ${
                    selectedScriptId === script.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{script.name}</span>
                  </div>
                  {selectedScriptId === script.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScript(script.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t space-y-2">
             <Button
               onClick={handleAddScript}
               className="w-full flex items-center justify-center gap-2"
               variant="outline"
             >
               <Plus size={16} />
               <span>添加脚本文件</span>
             </Button>
             <div className="text-xs text-muted-foreground text-center">
                共 {scripts.length} 个脚本
             </div>
          </div>
        </div>

        {/* Main Content: Script Details */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {selectedScript ? selectedScript.name : '选择一个脚本'}
              {selectedScript && <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{selectedScript.category}</span>}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {selectedScript ? (
            <>
            <Tabs defaultValue="functions" className="flex-1 flex flex-col min-h-0">
               <div className="px-6 pt-2 border-b bg-background">
                 <TabsList className="w-full justify-start h-10 bg-transparent p-0">
                   <TabsTrigger value="functions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4 bg-transparent shadow-none">函数列表</TabsTrigger>
                   <TabsTrigger value="settings" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4 bg-transparent shadow-none">配置设置</TabsTrigger>
                 </TabsList>
               </div>
               
               <TabsContent value="functions" className="flex-1 overflow-auto p-6 m-0 focus-visible:outline-none">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground break-all">
                      路径: {selectedScript.savedPath}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={analyzeSelectedScript} 
                      disabled={analyzing}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
                      刷新函数列表
                    </Button>
                  </div>

                  {analyzing ? (
                    <div className="flex items-center justify-center h-40 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      正在分析文件...
                    </div>
                  ) : analysisResult ? (
                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-muted-foreground mb-4">
                        可用函数 ({analysisResult.functions.length})
                      </h3>
                      
                      <PythonFunctionList
                        functions={analysisResult.functions}
                        selectedFunctionNames={new Set(selectedScript.functions.map(func => func.name))}
                        expandedFunctionNames={expandedFuncs}
                        onToggleSelect={(func, selected) => handleToggleFunction(func, selected)}
                        onToggleExpand={toggleFuncExpand}
                        getDisplayName={(func) => {
                          const savedFunc = selectedScript.functions.find(f => f.name === func.name);
                          return savedFunc?.label || func.name;
                        }}
                        getSecondaryName={(func) => {
                          const savedFunc = selectedScript.functions.find(f => f.name === func.name);
                          return savedFunc?.label ? func.name : null;
                        }}
                        getDescription={(func) => func.description || '无描述'}
                        testInputs={testInputs}
                        testResults={testResults}
                        onTestInputChange={handleTestInputChange}
                        onRunTest={runTest}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        无法加载文件分析
                    </div>
                  )}
               </TabsContent>
               
               <TabsContent value="settings" className="flex-1 overflow-auto p-6 m-0 focus-visible:outline-none">
                  <div className="space-y-6 max-w-2xl mx-auto">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">基础信息</h3>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>脚本名称</Label>
                                <Input value={editName} onChange={e => setEditName(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>描述</Label>
                                <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>分类</Label>
                                <Select value={editCategory} onValueChange={(v: any) => setEditCategory(v)}>
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
                        </div>
                    </div>
                    
                    {/* Config */}
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-medium">执行配置</h3>
                        <div className="grid gap-4 grid-cols-2">
                            <div className="grid gap-2">
                                <Label>超时时间 (秒)</Label>
                                <Input 
                                    type="number" 
                                    value={editConfig.timeout} 
                                    onChange={e => setEditConfig({...editConfig, timeout: Number(e.target.value)})} 
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>内存限制 (MB)</Label>
                                <Input 
                                    type="number" 
                                    value={editConfig.memoryLimit || 256} 
                                    onChange={e => setEditConfig({...editConfig, memoryLimit: Number(e.target.value)})} 
                                />
                            </div>
                            <div className="col-span-2">
                                <div className="flex items-center gap-2">
                                    <Switch 
                                        checked={editConfig.requireApproval} 
                                        onCheckedChange={c => setEditConfig({...editConfig, requireApproval: c})} 
                                    />
                                    <Label>需要用户确认执行</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* AI Control */}
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-medium">AI 控制</h3>
                        <div className="flex items-center gap-2">
                            <Switch 
                                checked={editAiControl} 
                                onCheckedChange={setEditAiControl} 
                            />
                            <Label>允许AI自动调用此脚本</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            启用后，AI可以通过分析脚本名称和描述自动决定是否调用此脚本。
                        </p>
                    </div>
                    
                  </div>
               </TabsContent>
            </Tabs>
            <div className="pt-6 border-t flex items-center justify-between">
                <Button
                    variant="destructive"
                    onClick={() => selectedScript && requestDeleteScript(selectedScript.id)}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除脚本
                </Button>
                <Button onClick={handleSaveSettings} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? '保存中...' : '保存更改'}
                </Button>
            </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
               请从左侧选择一个脚本进行管理
            </div>
          )}
        </div>
      </div>

      {/* 添加脚本弹窗 */}
      <PythonScriptAddModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleScriptSaved}
      />

      <AlertDialog open={!!deleteScriptId} onOpenChange={(open) => !open && setDeleteScriptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除脚本吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，这将删除脚本文件与对应的配置，并移除所有相关组件。
              {deleteScript && (
                <div className="mt-2 text-xs text-muted-foreground">
                  脚本：{deleteScript.name} | 路径：{deleteScript.savedPath}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteScript} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
