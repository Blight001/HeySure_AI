/**
 * Python组件注册表
 * 管理所有自定义Python组件的注册、加载、验证
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  PythonComponent,
  PythonComponentCategory,
  PythonComponentConfig,
  PythonPortConfig,
  PythonValidationResult,
  PythonImportRequest,
  AIControlRule,
  ControlLimits,
  PythonFunctionInfo,
  PythonFileAnalysis,
  PythonScriptConfig,
  PythonParameterInfo,
  PythonReturnInfo,
} from '@/types/flow';

// 类别信息接口
interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
}

class PythonComponentRegistry {
  private components: Map<string, PythonComponent> = new Map();
  private categories: Map<string, CategoryInfo> = new Map([
    ['data_processing', { id: 'data_processing', name: '数据处理', icon: '📊' }],
    ['text_analysis', { id: 'text_analysis', name: '文本分析', icon: '📝' }],
    ['web_search', { id: 'web_search', name: '网络搜索', icon: '🌐' }],
    ['file_operation', { id: 'file_operation', name: '文件操作', icon: '📁' }],
    ['math_calculator', { id: 'math_calculator', name: '数学计算', icon: '🔢' }],
    ['ai_tool', { id: 'ai_tool', name: 'AI工具', icon: '🤖' }],
    ['custom', { id: 'custom', name: '自定义', icon: '⚙️' }],
  ]);

  constructor() {
    // 初始化默认组件
    this.initDefaultComponents();
  }

  // 初始化默认组件
  private initDefaultComponents() {
    // 示例：文本处理组件
    this.register({
      id: 'default-text-process',
      name: '文本处理',
      version: '1.0.0',
      author: 'HeySure',
      description: '基础的文本处理功能：清洗、格式化、转换',
      category: 'text_analysis',
      filePath: 'builtins/text_process.py',
      functionName: 'process_text',
      enabled: true,
      config: {
        timeout: 30,
        requireApproval: false,
        allowedImports: ['re', 'json', 'datetime'],
        blockedImports: ['os', 'sys', 'subprocess'],
      },
      inputs: [
        { id: 'input', name: 'input', label: '输入文本', dataType: 'string', required: true },
        { id: 'operation', name: 'operation', label: '操作类型', dataType: 'string', required: true, defaultValue: 'clean' },
      ],
      outputs: [
        { id: 'output', name: 'output', label: '输出文本', dataType: 'string', required: true },
        { id: 'success', name: 'success', label: '是否成功', dataType: 'boolean', required: true },
      ],
      aiControl: [
        {
          id: 'default-text-trigger',
          name: '文本处理触发',
          description: '当用户提到文本处理相关需求时触发',
          priority: 10,
          enabled: true,
          triggers: [
            { type: 'keyword', pattern: '处理文本|清洗文本|格式化' },
            { type: 'intent', intentType: 'text_processing' },
          ],
          inputRules: [
            { portId: 'input', required: true, typeValidation: true },
            { portId: 'operation', required: false, typeValidation: false },
          ],
          outputRules: [
            { portId: 'output', exposeToAI: true, description: '处理后的文本内容', formatHint: '原始文本' },
            { portId: 'success', exposeToAI: true, description: '处理是否成功' },
          ],
          limits: {
            maxCallsPerExecution: 10,
            maxTotalCalls: 0,
            requireUserPermission: false,
          },
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 示例：数学计算组件
    this.register({
      id: 'default-math-calc',
      name: '数学计算',
      version: '1.0.0',
      author: 'HeySure',
      description: '执行数学计算和公式求解',
      category: 'math_calculator',
      filePath: 'builtins/math_calc.py',
      functionName: 'calculate',
      enabled: true,
      config: {
        timeout: 30,
        requireApproval: false,
        allowedImports: ['math', 'random', 'statistics'],
        blockedImports: ['os', 'sys', 'subprocess', 'eval', 'exec'],
      },
      inputs: [
        { id: 'expression', name: 'expression', label: '计算表达式', dataType: 'string', required: true },
        { id: 'precision', name: 'precision', label: '精度', dataType: 'number', required: false, defaultValue: 6 },
      ],
      outputs: [
        { id: 'result', name: 'result', label: '计算结果', dataType: 'number', required: true },
        { id: 'error', name: 'error', label: '错误信息', dataType: 'string', required: false },
      ],
      aiControl: [
        {
          id: 'default-math-trigger',
          name: '数学计算触发',
          description: '当用户需要计算时触发',
          priority: 10,
          enabled: true,
          triggers: [
            { type: 'keyword', pattern: '计算|求解|统计' },
            { type: 'intent', intentType: 'calculation' },
          ],
          inputRules: [
            { portId: 'expression', required: true, typeValidation: true },
          ],
          outputRules: [
            { portId: 'result', exposeToAI: true, description: '计算结果', formatHint: '数值' },
            { portId: 'error', exposeToAI: true, description: '错误信息' },
          ],
          limits: {
            maxCallsPerExecution: 20,
            maxTotalCalls: 0,
            requireUserPermission: false,
          },
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  // 注册组件
  register(component: PythonComponent): PythonComponent {
    if (!component.id) {
      component.id = uuidv4();
    }
    component.createdAt = component.createdAt || Date.now();
    component.updatedAt = Date.now();
    
    this.components.set(component.id, component);
    return component;
  }

  // 注销组件
  unregister(id: string): boolean {
    return this.components.delete(id);
  }

  // 获取组件
  get(id: string): PythonComponent | undefined {
    return this.components.get(id);
  }

  // 获取所有组件
  getAll(): PythonComponent[] {
    return Array.from(this.components.values());
  }

  // 获取启用的组件
  getEnabled(): PythonComponent[] {
    return Array.from(this.components.values()).filter(c => c.enabled);
  }

  // 按类别获取组件
  getByCategory(category: PythonComponentCategory): PythonComponent[] {
    return Array.from(this.components.values()).filter(
      c => c.category === category && c.enabled
    );
  }

  // 更新组件
  update(id: string, updates: Partial<PythonComponent>): PythonComponent | undefined {
    const component = this.components.get(id);
    if (!component) return undefined;

    const updated = { ...component, ...updates, updatedAt: Date.now() };
    this.components.set(id, updated);
    return updated;
  }

  // 启用/禁用组件
  setEnabled(id: string, enabled: boolean): boolean {
    const component = this.components.get(id);
    if (!component) return false;

    component.enabled = enabled;
    component.updatedAt = Date.now();
    return true;
  }

  // 验证Python文件
  async validatePythonFile(filePath: string, functionName: string): Promise<PythonValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 模拟验证 - 实际应通过Python进程执行验证脚本
      // 这里先返回基本验证结果
      if (!filePath.endsWith('.py')) {
        errors.push('文件必须是 .py 格式');
      }

      if (!functionName || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
        errors.push('函数名无效，应为有效的Python标识符');
      }

      // 检查默认组件
      if (filePath.startsWith('builtins/')) {
        warnings.push('这是内置组件，无需验证');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        componentInfo: errors.length === 0 ? {
          name: functionName,
          description: '',
          inputs: [],
          outputs: [],
        } : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`验证失败: ${error}`],
        warnings: [],
      };
    }
  }

  // 从Python文件导入组件
  async importFromPython(request: PythonImportRequest): Promise<PythonComponent> {
    const validation = await this.validatePythonFile(request.filePath, request.functionName);
    
    if (!validation.valid) {
      throw new Error(`验证失败: ${validation.errors.join(', ')}`);
    }

    // 创建默认组件配置
    const component: PythonComponent = {
      id: uuidv4(),
      name: request.functionName,
      version: '1.0.0',
      author: 'User',
      description: validation.componentInfo?.description || '自定义Python组件',
      category: 'custom',
      filePath: request.filePath,
      functionName: request.functionName,
      enabled: true,
      config: {
        timeout: 30,
        requireApproval: request.config?.requireApproval || false,
        allowedImports: request.config?.allowedImports || [],
        blockedImports: request.config?.blockedImports || [],
        environmentVars: request.config?.environmentVars,
        memoryLimit: request.config?.memoryLimit,
      },
      inputs: validation.componentInfo?.inputs || [],
      outputs: validation.componentInfo?.outputs || [],
      aiControl: [
        this.createDefaultAIRule(request.functionName),
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.register(component);
  }

  // 创建默认AI规则
  private createDefaultAIRule(functionName: string): AIControlRule {
    const ruleId = uuidv4();
    return {
      id: ruleId,
      name: `${functionName} 默认规则`,
      description: `自动为 ${functionName} 创建的默认AI控制规则`,
      priority: 5,
      enabled: true,
      triggers: [
        { type: 'keyword', pattern: functionName },
      ],
      inputRules: [],
      outputRules: [],
      limits: {
        maxCallsPerExecution: 10,
        maxTotalCalls: 0,
        requireUserPermission: false,
      },
    };
  }

  // 添加AI控制规则
  addAIRule(componentId: string, rule: AIControlRule): boolean {
    const component = this.components.get(componentId);
    if (!component) return false;

    if (!rule.id) {
      rule.id = uuidv4();
    }
    component.aiControl.push(rule);
    component.updatedAt = Date.now();
    return true;
  }

  // 更新AI控制规则
  updateAIRule(componentId: string, ruleId: string, updates: Partial<AIControlRule>): boolean {
    const component = this.components.get(componentId);
    if (!component) return false;

    const ruleIndex = component.aiControl.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    component.aiControl[ruleIndex] = {
      ...component.aiControl[ruleIndex],
      ...updates,
    };
    component.updatedAt = Date.now();
    return true;
  }

  // 删除AI控制规则
  removeAIRule(componentId: string, ruleId: string): boolean {
    const component = this.components.get(componentId);
    if (!component) return false;

    const index = component.aiControl.findIndex(r => r.id === ruleId);
    if (index === -1) return false;

    component.aiControl.splice(index, 1);
    component.updatedAt = Date.now();
    return true;
  }

  // 检查组件是否可被AI调用
  canAICall(componentId: string, context?: { intent?: string; keywords?: string[] }): {
    canCall: boolean;
    applicableRules: AIControlRule[];
  } {
    const component = this.components.get(componentId);
    if (!component || !component.enabled) {
      return { canCall: false, applicableRules: [] };
    }

    const applicableRules: AIControlRule[] = [];

    for (const rule of component.aiControl) {
      if (!rule.enabled) continue;

      // 检查触发条件
      let triggered = false;
      for (const trigger of rule.triggers) {
        if (trigger.type === 'always') {
          triggered = true;
          break;
        }
        
        if (trigger.type === 'keyword' && context?.keywords) {
          triggered = context.keywords.some(k => 
            trigger.pattern?.toLowerCase().includes(k.toLowerCase())
          );
        }
        
        if (trigger.type === 'intent' && context?.intent) {
          triggered = trigger.intentType === context.intent;
        }
      }

      if (triggered) {
        applicableRules.push(rule);
      }
    }

    return {
      canCall: applicableRules.length > 0,
      applicableRules: applicableRules.sort((a, b) => b.priority - a.priority),
    };
  }

  // 导出组件
  export(id: string): object | null {
    const component = this.components.get(id);
    return component ? { ...component } : null;
  }

  // 批量导入组件
  import(components: PythonComponent[]): number {
    let imported = 0;
    for (const component of components) {
      try {
        // 生成新ID避免冲突
        const newComponent = {
          ...component,
          id: uuidv4(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        this.register(newComponent);
        imported++;
      } catch {
        // 忽略导入失败的组件
      }
    }
    return imported;
  }

  // 获取类别列表
  getCategories(): CategoryInfo[] {
    return Array.from(this.categories.values());
  }

  // 保存到本地存储
  saveToStorage(): string {
    const data = {
      components: Array.from(this.components.entries()),
    };
    return JSON.stringify(data);
  }

  // 从本地存储加载
  loadFromStorage(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.components) {
        this.components = new Map(data.components);
      }
    } catch (error) {
      console.error('加载组件失败:', error);
    }
  }

  // ============ 模式脚本管理 ============

  // 获取模式文件夹路径
  async getModeFolderPath(): Promise<string> {
    const python = window.electronAPI?.python;
    if (!python) {
      return 'data/script/mode';
    }
    try {
      return await python.getModeDir();
    } catch {
      return 'data/script/mode';
    }
  }

  // 读取Python文件内容
  async readPythonFile(filePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const fs = window.electronAPI?.fs;
      let content: string;

      if (!fs) {
        // 模拟环境
        if (window.fileSystem?.readFile) {
          try {
            content = await window.fileSystem.readFile(filePath);
            return { success: true, content };
          } catch (e) {
            return { success: false, error: String(e) };
          }
        }
        // 如果没有文件系统API，返回模拟内容
        return { success: true, content: this.getMockPythonContent() };
      }

      try {
        content = await fs.readFile(filePath, 'utf-8');
        return { success: true, content };
      } catch (readError) {
        console.warn('fs读取失败，尝试fileSystem API:', readError);
        if (window.fileSystem?.readFile) {
          try {
            content = await window.fileSystem.readFile(filePath);
            return { success: true, content };
          } catch (fsError) {
            return { success: false, error: `读取文件失败: ${fsError}` };
          }
        }
        return { success: false, error: `读取文件失败: ${readError}` };
      }
    } catch (error) {
      return { success: false, error: `读取文件异常: ${error}` };
    }
  }

  // 复制Python文件到mode文件夹
  async copyScriptToModeFolder(sourcePath: string, scriptId: string): Promise<{ success: boolean; savedPath?: string; content?: string; error?: string }> {
    console.log('=== copyScriptToModeFolder ===');
    console.log('sourcePath:', sourcePath);
    console.log('scriptId:', scriptId);

    try {
      const fs = window.electronAPI?.fs;

      console.log('fs 存在:', !!fs);

      // 读取源文件内容
      const readResult = await this.readPythonFile(sourcePath);
      if (!readResult.success || !readResult.content) {
        return {
          success: false,
          error: readResult.error || '读取源文件失败'
        };
      }
      const content = readResult.content;

      if (!fs) {
        // 模拟环境
        console.log('进入模拟环境分支');
        const fileName = sourcePath.split(/[/\\]/).pop() || 'script.py';
        const savedPath = `data\\script\\mode\\${fileName}`;
        return { success: true, savedPath, content };
      }

      // 使用已有的 getModeFolderPath 方法获取路径
      const modeFolder = await this.getModeFolderPath();
      console.log('modeFolder:', modeFolder);

      // 确保目录存在
      try {
        fs.mkdirSync(modeFolder, { recursive: true });
        console.log('目录创建成功');
      } catch (mkdirError) {
        console.warn('目录创建失败（可能已存在）:', mkdirError);
      }

      const originalFileName = sourcePath.split(/[/\\]/).pop() || 'script.py';
      // 使用原文件名，保留完整文件名（包括 .py 扩展名）
      const newFileName = originalFileName;
      const pathApi = window.electronAPI?.path;
      const savedPath = pathApi?.join ? await pathApi.join(modeFolder, newFileName) : `${modeFolder}\\${newFileName}`;
      const normalizedSavedPath = this.normalizeWindowsPath(savedPath);

      console.log('savedPath:', normalizedSavedPath);

      // 写入目标位置
      await fs.writeFile(normalizedSavedPath, content, 'utf-8');
      console.log('文件写入成功');

      console.log('=== copyScriptToModeFolder 结束 ===');
      return { success: true, savedPath: normalizedSavedPath, content };
    } catch (error) {
      console.error('copyScriptToModeFolder 异常:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `复制文件到mode目录失败: ${errorMessage}`
      };
    }
  }

  // 获取main.py路径
  async getMainPyPath(): Promise<string> {
    const python = window.electronAPI?.python;
    if (!python) {
      return 'data/script/main.py';
    }
    try {
      return await python.getMainPyPath();
    } catch {
      return 'data/script/main.py';
    }
  }

  // 读取main.py内容
  async readMainPyContent(): Promise<string> {
    try {
      const fs = window.electronAPI?.fs;
      if (!fs) {
        // 模拟环境
        return this.getDefaultMainPyContent();
      }

      const mainPyPath = await this.getMainPyPath();
      try {
        console.log('[readMainPyContent] 开始读取:', mainPyPath);
        const content = await fs.readFile(mainPyPath, 'utf-8');
        console.log('[readMainPyContent] 读取成功, 长度:', content?.length);
        // 确保返回的是字符串
        if (typeof content !== 'string') {
          console.warn('[readMainPyContent] 返回值不是字符串，尝试转换');
          return String(content);
        }
        return content;
      } catch (readError) {
        console.log('[readMainPyContent] 文件不存在或读取失败，创建默认内容');
        // 文件不存在，创建默认内容
        const defaultContent = this.getDefaultMainPyContent();
        try {
          await fs.writeFile(mainPyPath, defaultContent, 'utf-8');
          console.log('[readMainPyContent] 默认文件创建成功');
        } catch (writeError) {
          console.error('[readMainPyContent] 创建默认文件失败:', writeError);
          // 即使写入失败也返回默认内容
        }
        return defaultContent;
      }
    } catch (error) {
      console.error('读取main.py失败:', error);
      return this.getDefaultMainPyContent();
    }
  }

  // 获取默认main.py内容
  getDefaultMainPyContent(): string {
    return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HeySure AI 主脚本
自动生成 - 请勿手动修改此文件
所有自定义函数导入将自动添加到这里
"""

import sys
import json
from typing import Any, Dict, List, Optional

# 模式脚本存储
_mode_scripts: Dict[str, Any] = {}


def register_mode_script(script_id: str, module: Any) -> None:
    """注册模式脚本模块"""
    _mode_scripts[script_id] = module


def get_mode_script(script_id: str) -> Optional[Any]:
    """获取模式脚本模块"""
    return _mode_scripts.get(script_id)


def execute_mode_function(script_id: str, func_name: str, **kwargs: Any) -> Any:
    """执行模式脚本中的函数"""
    module = get_mode_script(script_id)
    if module is None:
        raise ValueError(f"未找到脚本: {script_id}")
    
    func = getattr(module, func_name, None)
    if func is None:
        raise ValueError(f"未在脚本 {script_id} 中找到函数: {func_name}")
    
    return func(**kwargs)


# ========== 自定义函数导入区域 ==========

# 此区域的内容由系统自动管理
# 请勿在此处添加自定义代码
# 如需添加自定义函数，请在对应的mode文件中编写

`;
  }

  // 更新main.py文件，添加函数导入
  async updateMainPyWithImports(scriptConfigs: PythonScriptConfig[]): Promise<{ success: boolean; error?: string }> {
    try {
      const fs = window.electronAPI?.fs;
      if (!fs) {
        // 模拟环境
        return { success: true };
      }

      // 读取当前的main.py内容
      let mainContent = await this.readMainPyContent();

      // 找到导入区域的标记
      const importMarkerStart = '# ========== 自定义函数导入区域 ==========';
      const importMarkerEnd = '# ========== 此区域的内容由系统自动管理 ==========';

      // 生成新的导入内容
      const importStatements: string[] = [];
      const registerStatements: string[] = [];

      for (const config of scriptConfigs) {
        if (config.functions.length === 0) continue;

        const modeFileName = config.savedPath.split(/[/\\]/).pop()?.replace('.py', '') || config.id;
        const moduleName = modeFileName.replace(/[^a-zA-Z0-9_]/g, '_');

        importStatements.push(
          `# --- 脚本: ${config.name} ---`
        );

        for (const func of config.functions) {
          const importName = `${moduleName}_${func.name}`;
          importStatements.push(`from mode.${modeFileName} import ${func.name} as ${importName}`);
          registerStatements.push(`register_mode_script("${config.id}", sys.modules.get("mode.${modeFileName}") or sys.modules.get("${modeFileName}"))`);
        }

        importStatements.push('');
      }

      // 构建新的导入区域
      const newImportSection = `${importMarkerStart}
# 此区域的内容由系统自动管理
# 请勿在此处添加自定义代码
# 如需添加自定义函数，请在对应的mode文件中编写

${importStatements.join('\n')}

${registerStatements.join('\n')}
${importMarkerEnd}`;

      // 替换导入区域
      const importPattern = /# ========== 自定义函数导入区域 ==========[\s\S]*?# ========== 此区域的内容由系统自动管理 ==========/;
      mainContent = mainContent.replace(importPattern, newImportSection);

      // 写入更新后的内容
      const mainPyPath = await this.getMainPyPath();
      await fs.writeFile(mainPyPath, mainContent, 'utf-8');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新main.py失败'
      };
    }
  }

  // 为单个脚本添加导入到main.py
  async addImportToMainPy(config: PythonScriptConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const fs = window.electronAPI?.fs;
      if (!fs) {
        // 模拟环境
        return { success: true };
      }

      const mainContent = await this.readMainPyContent();

      const modeFileName = config.savedPath.split(/[/\\]/).pop()?.replace('.py', '') || config.id;
      const moduleName = modeFileName.replace(/[^a-zA-Z0-9_]/g, '_');

      // 生成导入语句
      const newImports: string[] = [];

      for (const func of config.functions) {
        const importName = `${moduleName}_${func.name}`;
        newImports.push(`from mode.${modeFileName} import ${func.name} as ${importName}`);
      }

      // 找到注册位置（此变量用于参考，实际不使用）
      const _registerPattern = /register_mode_script\("config\.id",/;

      // 检查是否已经存在导入
      for (const _func of config.functions) {
        const importCheck = `from mode.${modeFileName} import`;
        if (mainContent.includes(importCheck)) {
          // 已经存在，跳过
          return { success: true };
        }
      }

      // 插入新的导入（放在标记之后）
      const markerLine = '# 此区域的内容由系统自动管理';
      const existingContent = mainContent.split(markerLine)[0] + markerLine;

      const newContent = `${existingContent}
${newImports.join('\n')}

${markerLine}
# 此区域的内容由系统自动管理
# 请勿在此处添加自定义代码
# 如需添加自定义函数，请在对应的mode文件中编写

`;

      const mainPyPath = await this.getMainPyPath();
      await fs.writeFile(mainPyPath, newContent, 'utf-8');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('添加导入到main.py失败:', error);
      return {
        success: false,
        error: `添加导入失败: ${errorMessage}`
      };
    }
  }

  // 移除main.py中的导入
  async removeImportFromMainPy(config: PythonScriptConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const fs = window.electronAPI?.fs;
      if (!fs) {
        return { success: true };
      }

      const mainContent = await this.readMainPyContent();

      const modeFileName = config.savedPath.split(/[/\\]/).pop()?.replace('.py', '') || config.id;

      // 移除相关的导入语句
      const importPattern = new RegExp(`# --- 脚本: ${config.name} ---\n[\\s\\S]*?from mode\\.${modeFileName} import[\\s\\S]*?\n\n`, 'g');
      const newContent = mainContent.replace(importPattern, '');

      if (newContent !== mainContent) {
        const mainPyPath = await this.getMainPyPath();
        await fs.writeFile(mainPyPath, newContent, 'utf-8');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '从main.py移除导入失败'
      };
    }
  }

  // ============ 脚本文件管理 ============

  // 获取脚本文件夹路径
  async getScriptFolderPath(): Promise<string> {
    const python = window.electronAPI?.python;
    if (!python) {
      return 'data/script';
    }
    try {
      return await python.getScriptDir();
    } catch {
      return 'data/script';
    }
  }

  // 复制Python文件到脚本文件夹
  async copyScriptToFolder(sourcePath: string): Promise<{ success: boolean; savedPath?: string; content?: string; error?: string }> {
    return this.copyScriptToModeFolder(sourcePath, '');
  }

  // 检查是否是开发环境
  private isDevEnvironment(): boolean {
    return !window.electronAPI?.fs;
  }

  // 分析Python文件并提取函数信息
  async analyzePythonFile(filePath: string): Promise<PythonFileAnalysis> {
    try {
      // 读取文件内容
      let content: string;
      let contentSource: 'file' | 'fallback' = 'file';

      // 开发环境或读取失败时使用模拟数据
      if (this.isDevEnvironment()) {
        console.log('[PythonRegistry] 开发环境，使用模拟数据');
        content = this.getMockPythonContent();
        contentSource = 'fallback';
      } else {
        try {
          const { readFile } = await import('@/services/fileSystem');
          content = await readFile(filePath);
        } catch (readError) {
          console.warn('[PythonRegistry] 读取文件失败，使用模拟数据:', readError);
          content = this.getMockPythonContent();
          contentSource = 'fallback';
        }
      }

      const analysis = this.analyzePythonContent(content, filePath);
      analysis.contentSource = contentSource;
      return analysis;
    } catch (error) {
      throw new Error(`分析Python文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 分析Python内容并提取函数信息（不读取文件）
  analyzePythonContent(content: string, filePath: string): PythonFileAnalysis {
    const lines = content.split('\n');
    const functions: PythonFunctionInfo[] = [];
    let className = '';
    const fileName = filePath.split(/[/\\]/).pop()?.replace('.py', '') || 'module';
    const moduleName = fileName.replace(/[^a-zA-Z0-9_]/g, '_');

    let overallDescription = '';
    let scriptName = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line || line.startsWith('#')) continue;

      // 检测模块 docstring (通常在文件开头，允许前面有注释)
      if (!overallDescription && (line.startsWith('"""') || line.startsWith("'''")) && !className && functions.length === 0) {
        const delimiter = line.startsWith('"""') ? '"""' : "'''";
        let docContent = '';
        let endIdx = -1;

        // 检查是否是单行 docstring
        if (line.length > 3 && line.indexOf(delimiter, 3) !== -1) {
          endIdx = line.indexOf(delimiter, 3);
          docContent = line.substring(3, endIdx);
        } else {
          // 多行 docstring
          docContent = line.substring(3) + '\n';
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes(delimiter)) {
              docContent += lines[j].split(delimiter)[0];
              i = j; // 更新外层循环索引，跳过已处理的行
              break;
            }
            docContent += lines[j] + '\n';
            if (j === lines.length - 1) i = j; // 防止越界
          }
        }
        
        overallDescription = docContent.trim();

        // 解析元数据 (脚本名称, 描述)
        const nameMatch = overallDescription.match(/脚本名称[:：]\s*(.+)/);
        if (nameMatch) {
          scriptName = nameMatch[1].trim();
        }

        const descMatch = overallDescription.match(/描述[:：]\s*([\s\S]*?)(?:\n\s*(?:主要功能函数|Main Functions)[:：]|$)/i);
        if (descMatch) {
          overallDescription = descMatch[1].trim();
        }

        continue;
      }

      // 检测类定义（跳过类内部的成员）
      if (line.match(/^class\s+\w+/)) {
        const match = line.match(/^class\s+(\w+)/);
        if (match) {
          className = match[1];

          // 提取类的docstring
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            if (nextLine.startsWith('"""')) {
              const endIdx = nextLine.indexOf('"""', 3);
              if (endIdx > 0) {
                overallDescription = nextLine.substring(3, endIdx).trim();
              }
              break;
            }
            if (nextLine.startsWith('class ') || nextLine.startsWith('def ')) {
              break;
            }
            // 如果遇到非缩进行，说明类定义结束
            if (nextLine && !nextLine.startsWith(' ') && !nextLine.startsWith('\t')) {
              break;
            }
          }
        }
        continue;
      }

      // 检测函数定义（必须在行首，不能在类内部或嵌套函数）
      // 使用原始行 lines[i] 来确保没有缩进，只匹配顶层函数
      if (lines[i].match(/^def\s+\w+/)) {
        const funcInfo = this.parseFunctionLine(line, i + 1);
        if (funcInfo) {
          // 提取函数的docstring
          const funcDoc = this.extractDocstring(lines, i + 1);
          funcInfo.description = funcDoc.description;

          // 设置默认显示名称为函数简介
          if (funcInfo.description) {
            funcInfo.label = funcInfo.description;
          }

          // 尝试解析参数类型和描述
          const paramDetails = this.parseParameterDetails(funcDoc.fullDoc, funcInfo.parameters);
          funcInfo.parameters = paramDetails;

          // 尝试解析返回值
          const returnInfo = this.parseReturnInfo(funcDoc.fullDoc);
          funcInfo.returns = returnInfo;

          // 提取源代码
          funcInfo.sourceCode = this.extractFunctionSource(lines, i + 1);

          functions.push(funcInfo);
        }
      }
    }

    // 如果没有检测到函数，返回默认信息
    if (functions.length === 0) {
      const desc = overallDescription || `${moduleName} 模块的主函数`;
      functions.push({
        name: moduleName,
        description: desc,
        label: desc,
        parameters: [],
        returns: { type: 'any', description: '执行结果' },
        lineNumber: 1,
      });
    }

    return {
      filePath,
      savedPath: filePath,
      functions,
      className,
      moduleName,
      scriptName,
      overallDescription: overallDescription || `${fileName} 模块`,
      contentSource: 'file',
    };
  }

  // 解析函数定义行
  private parseFunctionLine(line: string, lineNumber: number): PythonFunctionInfo | null {
    const match = line.match(/^def\s+(\w+)\s*\(([\s\S]*?)\)\s*:/);
    if (!match) return null;

    const funcName = match[1];
    const paramsStr = match[2];
    const parameters: PythonParameterInfo[] = [];

    // 解析参数列表
    if (paramsStr.trim()) {
      const params = paramsStr.split(',').map(p => p.trim());
      for (const param of params) {
        if (!param) continue;

        const paramMatch = param.match(/^(\w+)(?:\s*:\s*([^\=]+))?(?:\s*=\s*(.*))?$/);
        if (paramMatch) {
          const paramName = paramMatch[1];
          const paramType = paramMatch[2]?.trim() || 'any';
          const defaultValue = paramMatch[3]?.trim();

          parameters.push({
            name: paramName,
            type: paramType,
            description: `${paramName} 参数`,
            defaultValue: defaultValue ? this.parseDefaultValue(defaultValue) : undefined,
            required: !defaultValue,
          });
        }
      }
    }

    return {
      name: funcName,
      description: `${funcName} 函数`,
      parameters,
      returns: { type: 'any', description: '返回值' },
      lineNumber,
    };
  }

  // 解析默认值
  private parseDefaultValue(value: string): any {
    // 移除引号
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    // 数字
    if (!isNaN(Number(value))) return Number(value);
    // 布尔值
    if (value === 'True') return true;
    if (value === 'False') return false;
    if (value === 'None') return null;
    // 其他
    return value;
  }

  // 提取函数的docstring
  private extractDocstring(lines: string[], startLine: number): { description: string; fullDoc: string } {
    let description = '';
    let fullDoc = '';

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i].trim();

      // 找到docstring
      if (line.startsWith('"""') || line.startsWith("'''")) {
        const delimiter = line.startsWith('"""') ? '"""' : "'''";
        const endIdx = line.indexOf(delimiter, 3);

        if (endIdx > 0) {
          // 单行docstring
          fullDoc = line.substring(3, endIdx);
          description = fullDoc.split('\n')[0].trim();
          break;
        }

        // 多行docstring
        let docLines: string[] = [];
        if (line.length > 3) {
          docLines.push(line.substring(3));
        }

        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes(delimiter)) {
            const parts = lines[j].split(delimiter);
            docLines.push(parts[0]);
            break;
          }
          docLines.push(lines[j]);
        }

        fullDoc = docLines.join('\n').trim();
        description = fullDoc.split('\n')[0].trim();
        break;
      }

      // 如果遇到非空行且不是docstring，停止搜索
      if (line && !line.startsWith('#')) {
        break;
      }
    }

    return { description, fullDoc };
  }

  // 解析参数详细信息
  private parseParameterDetails(doc: string, params: PythonParameterInfo[]): PythonParameterInfo[] {
    if (!doc.trim()) return params;

    const argsMatch = doc.match(/(?:Args|Parameters|Arguments)[:\s]*([\s\S]*?)(?:\n\s*(?:\w+:|$)|$)/i);
    const argsSection = argsMatch ? argsMatch[1] : '';

    const paramLineRegex = /:param\s+(\w+)\s*:\s*([^\n]+)/gi;
    const paramLineMap: Record<string, string> = {};
    let paramLineMatch: RegExpExecArray | null;
    while ((paramLineMatch = paramLineRegex.exec(doc)) !== null) {
      paramLineMap[paramLineMatch[1]] = paramLineMatch[2].trim();
    }

    for (const param of params) {
      const argsMatchForParam = argsSection
        ? argsSection.match(new RegExp(`${param.name}\\s*[:\\(]\\s*(.+?)(?:\\n|$)`, 'i'))
        : null;
      const paramLineDesc = paramLineMap[param.name];
      const finalDesc = (paramLineDesc || argsMatchForParam?.[1] || '').trim();
      if (finalDesc) {
        param.description = finalDesc.replace(/\.$/, '');
      }
    }

    return params;
  }

  // 解析返回值信息
  private parseReturnInfo(doc: string): PythonReturnInfo {
    const returnsMatch = doc.match(/(?:Returns?|Yields?)[:\s]*([\s\S]*?)(?:\n\s*\w+:|$)/i);
    if (returnsMatch) {
      const returnText = returnsMatch[1].trim();
      // 尝试提取类型
      const typeMatch = returnText.match(/^\(([^)]+)\)/);
      const type = typeMatch ? typeMatch[1] : 'any';
      const description = typeMatch ? returnText.replace(typeMatch[0], '').trim() : returnText;
      return { type, description: description || '返回值' };
    }
    return { type: 'any', description: '返回值' };
  }

  // 提取函数源代码
  private extractFunctionSource(lines: string[], startLine: number): string {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let source: string[] = [];

    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i];

      for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (inString) {
          if (char === stringChar && (j === 0 || line[j - 1] !== '\\')) {
            inString = false;
          }
        } else {
          if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
          } else if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
          }
        }
      }

      source.push(line);

      if (braceCount === 0 && line.trim().endsWith(':')) {
        // 函数体开始，找结束
        braceCount = 0;
        for (let k = i + 1; k < lines.length; k++) {
          const bodyLine = lines[k];

          // 计算括号
          for (let j = 0; j < bodyLine.length; j++) {
            const char = bodyLine[j];
            if (char === '"' || char === "'") {
              inString = !inString;
              stringChar = char;
            } else if (!inString) {
              if (char === '{') braceCount++;
              if (char === '}') braceCount--;
            }
          }

          source.push(bodyLine);

          // 找到函数体结束（缩进回到或小于起始层）
          if (braceCount <= 0) {
            const trimmed = bodyLine.trim();
            if (trimmed && !trimmed.startsWith(' ') && !trimmed.startsWith('\t') && !trimmed.endsWith(':')) {
              break;
            }
          }
        }
        break;
      }

      // 找到函数定义结束
      if (line.trim() === '' || (!line.includes(':') && braceCount === 0)) {
        break;
      }
    }

    return source.join('\n');
  }

  // 获取模拟Python文件内容（开发测试用）
  getMockPythonContent(): string {
    return `
"""
这是一个示例Python模块，用于文本处理和数据清洗

提供常用的文本处理功能，包括：
- 文本清洗
- 格式转换
- 字符串操作
"""

import re
import json
from datetime import datetime

def process_text(
    text: str,
    operation: str = "clean",
    case_sensitive: bool = False
) -> dict:
    """
    处理文本内容

    Args:
        text: 输入的原始文本
        operation: 操作类型，可选值: clean, upper, lower, reverse
        case_sensitive: 是否区分大小写

    Returns:
        包含处理结果和状态的字典
    """
    if not text:
        return {"output": "", "success": False, "error": "输入文本为空"}

    try:
        if operation == "clean":
            output = re.sub(r'\\s+', ' ', text).strip()
        elif operation == "upper":
            output = text.upper() if case_sensitive else text.upper()
        elif operation == "lower":
            output = text.lower()
        elif operation == "reverse":
            output = text[::-1]
        else:
            output = text

        return {
            "output": output,
            "success": True,
            "operation": operation
        }
    except Exception as e:
        return {"output": "", "success": False, "error": str(e)}


def calculate_stats(
    numbers: list,
    precision: int = 2
) -> dict:
    """
    计算数值列表的统计信息

    Args:
        numbers: 数值列表
        precision: 结果精度（小数位数）

    Returns:
        包含各种统计信息的字典
    """
    if not numbers:
        return {"error": "输入列表为空"}

    stats = {
        "count": len(numbers),
        "sum": round(sum(numbers), precision),
        "average": round(sum(numbers) / len(numbers), precision),
        "min": min(numbers),
        "max": max(numbers)
    }

    return stats
`;
  }

  // 保存脚本配置到文件
  async saveScriptConfig(config: PythonScriptConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const fs = window.electronAPI?.fs;

      if (!fs) {
        // 模拟保存
        localStorage.setItem(`python_script_${config.id}`, JSON.stringify(config));
        return { success: true };
      }

      // 使用已有的 getScriptFolderPath 方法获取路径
      const scriptFolder = await this.getScriptFolderPath();
      const pathApi = window.electronAPI?.path;
      const configPath = pathApi?.join ? await pathApi.join(scriptFolder, `${config.id}.json`) : `${scriptFolder}\\${config.id}.json`;

      // 确保内容是纯字符串，避免 IPC 克隆问题
      const normalizedConfig: PythonScriptConfig = {
        ...config,
        savedPath: this.normalizeWindowsPath(config.savedPath)
      };
      const content = JSON.stringify(normalizedConfig, null, 2);
      await fs.writeFile(configPath, content, 'utf-8');

      // 同时更新组件注册表
      this.scriptToComponent(normalizedConfig);

      return { success: true };
    } catch (error) {
      // 确保错误消息可以被序列化
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('保存脚本配置失败:', error);
      return {
        success: false,
        error: `保存配置失败: ${errorMessage}`
      };
    }
  }

  private normalizeWindowsPath(pathValue: string): string {
    if (pathValue === undefined || pathValue === null) return pathValue as any;
    if (typeof pathValue !== 'string') return String(pathValue);
    if (!pathValue) return pathValue;
    if (/^[A-Za-z]:/.test(pathValue) || pathValue.startsWith('\\\\')) {
      return pathValue.replace(/\//g, '\\');
    }
    return pathValue;
  }

  // 从文件加载脚本配置
  async loadScriptConfigs(): Promise<PythonScriptConfig[]> {
    console.log('[PythonRegistry] 开始加载脚本配置...');
    try {
      const fs = window.electronAPI?.fs;

      if (!fs) {
        console.warn('[PythonRegistry] electronAPI.fs 不可用，尝试从 localStorage 加载');
        // 从localStorage加载
        const configs: PythonScriptConfig[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('python_script_')) {
            try {
              const config = JSON.parse(localStorage.getItem(key) || '{}');
              configs.push(config);
            } catch (parseError) {
              console.warn('[PythonRegistry] 解析 localStorage 配置失败:', key, parseError);
            }
          }
        }
        console.log('[PythonRegistry] 从 localStorage 加载了', configs.length, '个配置');
        return configs;
      }

      // 使用已有的 getScriptFolderPath 方法获取路径
      const scriptFolder = await this.getScriptFolderPath();
      console.log('[PythonRegistry] 脚本目录:', scriptFolder);

      const configs: PythonScriptConfig[] = [];

      try {
        const files = await fs.readdir(scriptFolder);
        console.log('[PythonRegistry] 发现文件:', files);
        
        for (const file of files) {
          if (file.endsWith('.json') && file !== 'index.json') {
            try {
              const configPath = `${scriptFolder}/${file}`;
              console.log('[PythonRegistry] 读取配置文件:', configPath);
              const content = await fs.readFile(configPath, 'utf-8');
              const config = JSON.parse(content);
              configs.push(config);
              console.log('[PythonRegistry] 成功加载配置:', config.name, 'ID:', config.id);
            } catch (fileError) {
              console.warn('[PythonRegistry] 加载配置文件失败:', file, fileError);
            }
          }
        }
      } catch (dirError) {
        console.warn('[PythonRegistry] 读取脚本目录失败:', dirError);
      }

      console.log('[PythonRegistry] 总共加载了', configs.length, '个脚本配置');
      return configs;
    } catch (error) {
      console.error('[PythonRegistry] 加载脚本配置失败:', error);
      // 返回空数组而不是抛出错误
      return [];
    }
  }

  // 删除脚本配置
  async deleteScriptConfig(configId: string, scriptPath?: string): Promise<{ success: boolean; error?: string }> {
    console.log('[PythonRegistry] 请求删除脚本配置:', configId);
    console.trace('删除请求调用栈');
    
    try {
      const fs = window.electronAPI?.fs;

      if (!fs) {
        localStorage.removeItem(`python_script_${configId}`);
        return { success: true };
      }

      // 1. 如果提供了脚本文件路径，尝试删除 .py 文件
      if (scriptPath) {
        try {
          console.log('[PythonRegistry] 尝试删除脚本文件:', scriptPath);
          // Check if existsSync is available, otherwise just try unlink
          const exists = fs.existsSync ? fs.existsSync(scriptPath) : true;
          
          if (exists) {
            await fs.unlink(scriptPath);
            console.log('[PythonRegistry] 脚本文件删除成功');
          } else {
            console.warn('[PythonRegistry] 脚本文件不存在, 跳过删除:', scriptPath);
          }
        } catch (unlinkError) {
          console.warn('[PythonRegistry] 删除脚本文件失败:', unlinkError);
          // 不中断流程，继续删除配置文件
        }
      }

      // 2. 删除配置文件 (.json)
      // 使用已有的 getScriptFolderPath 方法获取路径
      const scriptFolder = await this.getScriptFolderPath();
      const configPath = `${scriptFolder}/${configId}.json`;

      try {
        console.log('[PythonRegistry] 尝试删除配置文件:', configPath);
        await fs.unlink(configPath);
        console.log('[PythonRegistry] 配置文件删除成功');
      } catch (unlinkError) {
        // 文件可能不存在
        console.warn('[PythonRegistry] 删除配置文件失败 (可能不存在):', unlinkError);
      }

      // 从组件注册表移除
      this.components.delete(configId);
      
      // 同时也移除该脚本生成的所有组件
      let removedCount = 0;
      for (const [id] of this.components) {
        if (id.startsWith(`${configId}_`)) {
          this.components.delete(id);
          removedCount++;
        }
      }
      console.log('[PythonRegistry] 从注册表移除了脚本及其组件, 共', removedCount + 1, '项');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('删除脚本配置失败:', error);
      return {
        success: false,
        error: `删除配置失败: ${errorMessage}`
      };
    }
  }

  // 将脚本配置转换为组件
  private scriptToComponent(config: PythonScriptConfig): void {
    if (!config.functions || !Array.isArray(config.functions)) {
      console.warn('[PythonRegistry] 脚本配置缺少 functions 数组:', config.id);
      return;
    }

    console.log('[PythonRegistry] 正在将脚本转换为组件:', config.name, '包含函数数:', config.functions.length);

    for (const func of config.functions) {
      const componentId = `${config.id}_${func.name}`;
      console.log('[PythonRegistry] 处理函数:', func.name, '生成组件ID:', componentId);

      const inputs: PythonPortConfig[] = func.parameters.map((param, idx) => ({
        id: `param_${idx}`,
        name: param.name,
        label: param.description.split('\n')[0] || param.name,
        dataType: this.pythonTypeToDataType(param.type),
        required: param.required,
        defaultValue: param.defaultValue,
        description: param.description,
      }));

      const outputs: PythonPortConfig[] = [
        {
          id: 'output',
          name: 'output',
          label: '输出结果',
          dataType: 'any',
          required: true,
          description: func.returns.description,
        },
      ];

      // 如果返回的是dict，添加更多输出端口
      if (func.returns.type.toLowerCase().includes('dict') ||
          func.returns.type.toLowerCase().includes('object')) {
        outputs.push({
          id: 'success',
          name: 'success',
          label: '是否成功',
          dataType: 'boolean',
          required: true,
          description: '执行是否成功',
        });
        outputs.push({
          id: 'error',
          name: 'error',
          label: '错误信息',
          dataType: 'string',
          required: false,
          description: '错误信息（如果失败）',
        });
      }

      // 处理 savedPath，确保它是绝对路径或正确格式
      let filePath = config.savedPath;
      // 这里可以添加路径处理逻辑，目前保持原样但添加日志
      // console.log('[PythonRegistry] 组件文件路径:', filePath);

      const component: PythonComponent = {
        id: componentId,
        name: `${config.name} - ${func.label || func.name}`,
        version: '1.0.0',
        author: config.category === 'custom' ? 'User' : 'HeySure',
        description: func.description || config.description,
        category: config.category,
        filePath: filePath,
        functionName: func.name,
        enabled: true,
        config: config.componentConfig,
        inputs,
        outputs,
        aiControl: config.aiControl,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };

      this.components.set(componentId, component);
    }
  }

  // Python类型转换为数据类型
  private pythonTypeToDataType(pythonType: string): 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any' {
    const type = pythonType.toLowerCase().trim();

    if (type.includes('str')) return 'string';
    if (type.includes('int') || type.includes('float') || type.includes('number')) return 'number';
    if (type.includes('bool')) return 'boolean';
    if (type.includes('list') || type.includes('array')) return 'array';
    if (type.includes('dict') || type.includes('object') || type.includes('json')) return 'object';

    return 'any';
  }

  // 刷新所有脚本组件
  async refreshScriptComponents(): Promise<void> {
    console.log('[PythonRegistry] 正在刷新脚本组件...');
    const configs = await this.loadScriptConfigs();
    console.log('[PythonRegistry] 获取到', configs.length, '个配置用于刷新');

    // 清除旧的脚本组件
    let removedCount = 0;
    // 使用 Array.from 避免在迭代时修改 Map
    const currentIds = Array.from(this.components.keys());
    for (const id of currentIds) {
      // 移除所有自定义脚本生成的组件（假设ID以 script_ 开头）
      // 或者我们可以检查 category === 'custom'
      const comp = this.components.get(id);
      if (id.startsWith('script_') || (comp && comp.category === 'custom')) {
        this.components.delete(id);
        removedCount++;
      }
    }
    console.log('[PythonRegistry] 已清除', removedCount, '个旧组件');

    // 重新加载所有脚本组件
    let addedCount = 0;
    for (const config of configs) {
      try {
        this.scriptToComponent(config);
        addedCount += (config.functions ? config.functions.length : 0);
      } catch (err) {
        console.error('[PythonRegistry] 转换脚本到组件失败:', config.id, err);
      }
    }
    console.log('[PythonRegistry] 已重新注册', addedCount, '个新组件');
    console.log('[PythonRegistry] 当前总组件数:', this.components.size);
  }
}

// 导出单例实例
export const pythonRegistry = new PythonComponentRegistry();

// 导出默认配置
export const defaultPythonConfig: PythonComponentConfig = {
  timeout: 30,
  requireApproval: false,
  allowedImports: [],
  blockedImports: ['os', 'sys', 'subprocess', 'eval', 'exec', 'importlib'],
  memoryLimit: 256,
};

export const defaultControlLimits: ControlLimits = {
  maxCallsPerExecution: 10,
  maxTotalCalls: 0,
  requireUserPermission: false,
};
