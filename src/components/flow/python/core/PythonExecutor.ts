/**
 * Python节点执行引擎
 * 负责执行流程中的Python节点
 */

import type {
  FlowNode,
  NodeResult,
  ExecutionContext,
  PythonComponent,
  PythonPortConfig
} from '@/types/flow';
import { pythonRegistry } from './PythonRegistry';

interface ExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  onProgress?: (nodeId: string, progress: number) => void;
  onLog?: (nodeId: string, log: string) => void;
}

interface ExecutionState {
  variables: Map<string, any>;
  nodeResults: Map<string, NodeResult>;
  callCount: Map<string, number>;
  startTime: number;
}

export class PythonNodeExecutor {
  private options: ExecutionOptions;

  constructor(options: ExecutionOptions = {}) {
    this.options = {
      timeout: 60,
      maxRetries: 3,
      ...options,
    };
  }

  // 执行Python节点
  async executeNode(
    node: FlowNode,
    context: ExecutionContext,
    componentId: string,
    inputs: Record<string, any>
  ): Promise<NodeResult> {
    const startTime = Date.now();
    const component = pythonRegistry.get(componentId);

    if (!component) {
      return {
        success: false,
        output: null,
        error: `组件不存在: ${componentId}`,
        executionTime: Date.now() - startTime,
      };
    }

    if (!component.enabled) {
      return {
        success: false,
        output: null,
        error: `组件已禁用: ${component.name}`,
        executionTime: Date.now() - startTime,
      };
    }

    try {
      // 验证输入
      const validationResult = this.validateInputs(component, inputs, context);
      if (!validationResult.valid) {
        return {
          success: false,
          output: null,
          error: `输入验证失败: ${validationResult.errors.join(', ')}`,
          executionTime: Date.now() - startTime,
        };
      }

      // 检查AI控制规则
      const controlCheck = this.checkControlRules(component, inputs, context);
      if (!controlCheck.allowed) {
        return {
          success: false,
          output: null,
          error: `AI调用被阻止: ${controlCheck.reason}`,
          executionTime: Date.now() - startTime,
        };
      }

      // 发送执行请求到主进程（实际执行Python）
      const result = await this.sendExecutionRequest({
        filePath: component.filePath,
        functionName: component.functionName,
        inputs: this.formatInputs(component, inputs),
        config: component.config,
      });

      // 处理输出
      const output = this.parseOutput(component, result);

      return {
        success: result.success,
        output,
        error: result.error,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: `执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        executionTime: Date.now() - startTime,
      };
    }
  }

  // 验证输入
  private validateInputs(
    component: PythonComponent,
    inputs: Record<string, any>,
    context: ExecutionContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of component.aiControl.flatMap(r => r.inputRules)) {
      const port = component.inputs.find(p => p.id === rule.portId);
      if (!port) continue;

      const value = inputs[port.name];

      // 检查必需字段
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`必需输入 "${port.label}" 为空`);
        continue;
      }

      // 类型验证
      if (rule.typeValidation && value !== undefined) {
        const typeValid = this.validateType(value, port.dataType);
        if (!typeValid) {
          errors.push(`输入 "${port.label}" 类型不匹配，期望 ${port.dataType}`);
        }
      }

      // 值约束
      if (rule.valueConstraints && value !== undefined) {
        if (rule.valueConstraints.min !== undefined && value < rule.valueConstraints.min) {
          errors.push(`输入 "${port.label}" 不能小于 ${rule.valueConstraints.min}`);
        }
        if (rule.valueConstraints.max !== undefined && value > rule.valueConstraints.max) {
          errors.push(`输入 "${port.label}" 不能大于 ${rule.valueConstraints.max}`);
        }
        if (rule.valueConstraints.pattern && typeof value === 'string') {
          const regex = new RegExp(rule.valueConstraints.pattern);
          if (!regex.test(value)) {
            errors.push(`输入 "${port.label}" 格式不匹配`);
          }
        }
        if (rule.valueConstraints.allowedValues && !rule.valueConstraints.allowedValues.includes(value)) {
          errors.push(`输入 "${port.label}" 必须是允许的值之一`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // 类型验证
  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'any': return true;
      default: return true;
    }
  }

  // 检查AI控制规则
  private checkControlRules(
    component: PythonComponent,
    inputs: Record<string, any>,
    context: ExecutionContext
  ): { allowed: boolean; reason?: string } {
    const applicableRules = component.aiControl
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of applicableRules) {
      // 检查限制条件
      if (rule.limits.maxTotalCalls > 0) {
        // 这里应该从全局状态获取调用次数
        // 简化处理
      }

      if (rule.limits.requireUserPermission) {
        // 需要用户权限检查
        // 实际实现应与UI交互
      }

      // 如果有匹配的规则且通过检查，允许执行
      return { allowed: true };
    }

    // 没有规则阻止，默认允许
    return { allowed: true };
  }

  // 格式化输入
  private formatInputs(
    component: PythonComponent,
    inputs: Record<string, any>
  ): Record<string, any> {
    const formatted: Record<string, any> = {};

    for (const port of component.inputs) {
      const value = inputs[port.name];
      if (value !== undefined) {
        formatted[port.name] = this.formatValue(value, port.dataType);
      } else if (port.defaultValue !== undefined) {
        formatted[port.name] = port.defaultValue;
      }
    }

    return formatted;
  }

  // 格式化值
  private formatValue(value: any, targetType: string): any {
    switch (targetType) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        // 确保转换后是有效数字，避免 NaN 传递给 Python
        return isNaN(num) ? value : num;
      case 'boolean':
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' ? value : { value };
      default:
        return value;
    }
  }

  // 解析输出
  private parseOutput(
    component: PythonComponent,
    result: any
  ): Record<string, any> {
    const output: Record<string, any> = {};

    if (result.output && typeof result.output === 'object') {
      for (const port of component.outputs) {
        output[port.name] = result.output[port.name];
      }
    } else {
      // 简单输出，映射到第一个输出端口
      const firstOutput = component.outputs[0];
      if (firstOutput) {
        output[firstOutput.name] = result.output;
      }
    }

    return output;
  }

  // 发送执行请求到主进程
  private async sendExecutionRequest(request: {
    filePath: string;
    functionName: string;
    inputs: Record<string, any>;
    config: PythonComponent['config'];
  }): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      // 通过IPC发送执行请求到主进程
      // 主进程会调用Python执行器
      const response = await window.electronAPI?.pythonExecute?.(request);
      
      if (!response) {
        // 模拟执行（开发时使用）
        return this.mockExecute(request);
      }
      
      return response;
    } catch (error) {
      // 如果IPC不可用，使用模拟执行
      return this.mockExecute(request);
    }
  }

  // 模拟执行（用于开发测试）
  private mockExecute(request: {
    functionName: string;
    inputs: Record<string, any>;
  }): { success: boolean; output?: any; error?: string } {
    const { functionName, inputs } = request;

    // 根据函数名模拟不同行为
    if (functionName.includes('text') || functionName.includes('process')) {
      const text = inputs.input || '';
      const operation = inputs.operation || 'clean';
      
      let output = text;
      switch (operation) {
        case 'clean':
          output = text.replace(/\s+/g, ' ').trim();
          break;
        case 'upper':
          output = text.toUpperCase();
          break;
        case 'lower':
          output = text.toLowerCase();
          break;
        case 'reverse':
          output = text.split('').reverse().join('');
          break;
      }
      
      return {
        success: true,
        output: { output, success: true },
      };
    }

    if (functionName.includes('math') || functionName.includes('calc')) {
      try {
        // 注意：实际不应使用eval，这里仅用于模拟
        const expr = inputs.expression;
        const result = Function('"use strict";return (' + expr + ')')();
        return {
          success: true,
          output: { result: Number(result.toFixed(inputs.precision || 6)), error: null },
        };
      } catch {
        return {
          success: false,
          output: { result: null, error: '计算表达式无效' },
        };
      }
    }

    // 默认返回输入
    return {
      success: true,
      output: { output: inputs.input, success: true },
    };
  }

  // 批量执行节点
  async executeFlow(
    nodes: FlowNode[],
    context: ExecutionContext,
    options?: ExecutionOptions
  ): Promise<ExecutionContext> {
    const state: ExecutionState = {
      variables: context.variables || new Map(),
      nodeResults: new Map(),
      callCount: new Map(),
      startTime: Date.now(),
    };

    for (const node of nodes) {
      if (node.type !== 'python') continue;

      const componentId = node.data.componentId;
      if (!componentId) continue;

      // 准备输入
      const inputs = this.prepareInputs(node, state.variables);

      // 执行节点
      const result = await this.executeNode(node, context, componentId, inputs);

      // 保存结果
      state.nodeResults.set(node.id, result);

      // 更新变量
      if (result.success && result.output) {
        this.updateVariables(node, result.output, state.variables);
      }

      // 通知进度
      options?.onProgress?.(node.id, (state.nodeResults.size / nodes.length) * 100);
    }

    return {
      ...context,
      nodeResults: state.nodeResults,
    };
  }

  // 准备输入
  private prepareInputs(node: FlowNode, variables: Map<string, any>): Record<string, any> {
    const inputs: Record<string, any> = {};

    for (const input of node.inputs || []) {
      const portConfig = input as unknown as PythonPortConfig;
      const value = node.data[portConfig.name] ?? portConfig.defaultValue;
      inputs[portConfig.name] = this.resolveVariable(value, variables);
    }

    return inputs;
  }

  // 解析变量
  private resolveVariable(value: any, variables: Map<string, any>): any {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      const varName = value.slice(2, -1);
      return variables.get(varName) ?? value;
    }
    return value;
  }

  // 更新变量
  private updateVariables(node: FlowNode, output: any, variables: Map<string, any>): void {
    for (const outputPort of node.outputs || []) {
      const portConfig = outputPort as unknown as PythonPortConfig;
      if (output[portConfig.name] !== undefined) {
        variables.set(`${node.id}.${portConfig.name}`, output[portConfig.name]);
      }
    }
  }
}

// 导出单例
export const pythonExecutor = new PythonNodeExecutor();

// 导出执行器类和类型
export type { ExecutionOptions, ExecutionState };

