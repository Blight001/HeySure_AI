/**
 * HeySure AI - Python 函数列表组件
 * 显示 Python 脚本中的函数列表：
 * - 函数列表展示
 * - 函数选择功能
 * - 函数展开查看详情
 * - 函数测试运行
 * - 测试结果展示
 */
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Play, Loader2 } from 'lucide-react';
import type { PythonFunctionInfo } from '@/types/flow';

type TestResult = { loading: boolean; success?: boolean; result?: any; error?: string; logs?: string };

interface PythonFunctionListProps {
  functions: PythonFunctionInfo[];
  selectedFunctionNames: Set<string>;
  expandedFunctionNames: Set<string>;
  onToggleSelect: (func: PythonFunctionInfo, selected: boolean) => void;
  onToggleExpand: (funcName: string) => void;
  getDisplayName?: (func: PythonFunctionInfo) => string;
  getSecondaryName?: (func: PythonFunctionInfo) => string | null;
  getDescription?: (func: PythonFunctionInfo) => string;
  testInputs: Record<string, Record<string, any>>;
  testResults: Record<string, TestResult>;
  onTestInputChange: (funcName: string, paramName: string, value: string) => void;
  onRunTest: (funcName: string) => void;
}

export function PythonFunctionList({
  functions,
  selectedFunctionNames,
  expandedFunctionNames,
  onToggleSelect,
  onToggleExpand,
  getDisplayName,
  getSecondaryName,
  getDescription,
  testInputs,
  testResults,
  onTestInputChange,
  onRunTest
}: PythonFunctionListProps) {
  return (
    <div className="space-y-2">
      {functions.map(func => {
        const isSelected = selectedFunctionNames.has(func.name);
        const isExpanded = expandedFunctionNames.has(func.name);
        const displayName = getDisplayName ? getDisplayName(func) : (func.label || func.name);
        const secondaryName = getSecondaryName ? getSecondaryName(func) : (func.label ? func.name : null);
        const description = getDescription ? getDescription(func) : (func.description || '无描述');

        return (
          <Card key={func.name} className={isSelected ? 'border-primary' : ''}>
            <CardHeader
              className="py-3 px-4 cursor-pointer hover:bg-muted/50"
              onClick={() => onToggleExpand(func.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggleSelect(func, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded"
                    aria-label={`选择函数 ${func.name}`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{displayName}</span>
                      {secondaryName && (
                        <span className="text-xs text-muted-foreground">({secondaryName})</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {description}
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
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-medium">函数测试</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => onRunTest(func.name)}
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
                    {func.parameters.length > 0 ? (
                      <div className="space-y-2">
                        {func.parameters.map(param => (
                          <div key={param.name} className="grid grid-cols-3 gap-2 items-start">
                            <Label className="text-xs text-muted-foreground text-right truncate" title={param.name}>
                              {param.name}
                              {param.required && <span className="text-destructive">*</span>}
                            </Label>
                            <div className="col-span-2">
                              <Input
                                className="h-7 text-xs"
                                placeholder={`输入 ${param.type} 值`}
                                value={testInputs[func.name]?.[param.name] || ''}
                                onChange={(e) => onTestInputChange(func.name, param.name, e.target.value)}
                              />
                              {param.description && param.description !== `${param.name} 参数` && (
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  {param.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-1">无参数，直接运行测试</p>
                    )}

                    {testResults[func.name] && (
                      <div className={`p-2 rounded text-xs border ${
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
                        {testResults[func.name].logs && (
                          <>
                            <div className="font-medium mt-2 mb-1 opacity-70">控制台输出:</div>
                            <pre className="whitespace-pre-wrap break-all max-h-40 overflow-auto bg-black/5 p-1 rounded font-mono text-[10px] text-gray-600">
                              {testResults[func.name].logs}
                            </pre>
                          </>
                        )}
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
  );
}
