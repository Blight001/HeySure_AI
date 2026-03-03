/**
 * AI控制规则系统
 * 管理和执行AI调用Python组件的规则
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  PythonComponent,
  AIControlRule,
  AIControlTrigger,
  InputRule,
  OutputRule,
  ControlLimits
} from '@/types/flow';
import { pythonRegistry } from './PythonRegistry';

export interface AIRuleEvaluation {
  componentId: string;
  ruleId: string;
  triggered: boolean;
  confidence: number;
  matchedTrigger?: AIControlTrigger;
  inputValidation?: {
    valid: boolean;
    errors: string[];
  };
  limitsCheck?: {
    allowed: boolean;
    reason?: string;
  };
}

export interface AIRuleContext {
  userInput?: string;
  intent?: string;
  keywords?: string[];
  currentVariables?: Record<string, any>;
  aiRole?: string;
  executionCount?: number;
}

// 预定义意图类型
export const INTENT_TYPES = {
  CALCULATION: 'calculation',
  TEXT_PROCESSING: 'text_processing',
  DATA_ANALYSIS: 'data_analysis',
  WEB_SEARCH: 'web_search',
  FILE_OPERATION: 'file_operation',
  CODE_GENERATION: 'code_generation',
  TRANSLATION: 'translation',
  SUMMARIZATION: 'summarization',
  QUESTION_ANSWERING: 'question_answering',
  GENERAL: 'general',
} as const;

export type IntentType = typeof INTENT_TYPES[keyof typeof INTENT_TYPES];

export class AIRuleManager {
  private context: AIRuleContext = {};

  // 设置评估上下文
  setContext(context: Partial<AIRuleContext>): void {
    this.context = { ...this.context, ...context };
  }

  // 清除上下文
  clearContext(): void {
    this.context = {};
  }

  // 评估所有组件的规则
  evaluateAllRules(): AIRuleEvaluation[] {
    const results: AIRuleEvaluation[] = [];
    const components = pythonRegistry.getEnabled();

    for (const component of components) {
      for (const rule of component.aiControl) {
        const evaluation = this.evaluateRule(component, rule);
        results.push(evaluation);
      }
    }

    return results;
  }

  // 评估单个规则
  evaluateRule(component: PythonComponent, rule: AIControlRule): AIRuleEvaluation {
    // 检查触发条件
    const { triggered, matchedTrigger, confidence } = this.checkTriggers(rule, this.context);

    // 检查输入验证
    const inputValidation = this.validateInputs(rule, this.context);

    // 检查限制
    const limitsCheck = this.checkLimits(rule, this.context);

    return {
      componentId: component.id,
      ruleId: rule.id,
      triggered,
      confidence: triggered ? confidence : 0,
      matchedTrigger,
      inputValidation,
      limitsCheck,
    };
  }

  // 检查触发条件
  private checkTriggers(
    rule: AIControlRule,
    context: AIRuleContext
  ): { triggered: boolean; matchedTrigger?: AIControlTrigger; confidence: number } {
    if (!rule.enabled) {
      return { triggered: false, confidence: 0 };
    }

    // 如果有always触发器，匹配最高优先级
    const alwaysTrigger = rule.triggers.find(t => t.type === 'always');
    if (alwaysTrigger) {
      return { triggered: true, matchedTrigger: alwaysTrigger, confidence: 1.0 };
    }

    let bestMatch: { trigger: AIControlTrigger; confidence: number } | null = null;

    for (const trigger of rule.triggers) {
      let confidence = 0;
      let matched = false;

      switch (trigger.type) {
        case 'keyword':
          if (context.keywords && trigger.pattern) {
            const keywords = trigger.pattern.split('|');
            const matchCount = context.keywords.filter(k =>
              keywords.some(kw => kw.toLowerCase().includes(k.toLowerCase()))
            ).length;
            if (matchCount > 0) {
              confidence = Math.min(matchCount / keywords.length, 1.0);
              matched = true;
            }
          }
          if (context.userInput && trigger.pattern) {
            const keywords = trigger.pattern.split('|');
            const matchCount = keywords.filter(kw =>
              context.userInput!.toLowerCase().includes(kw.toLowerCase())
            ).length;
            if (matchCount > 0) {
              confidence = Math.max(confidence, matchCount / keywords.length);
              matched = true;
            }
          }
          break;

        case 'intent':
          if (context.intent && trigger.intentType) {
            matched = context.intent === trigger.intentType;
            confidence = matched ? 1.0 : 0;
          }
          break;

        case 'context':
          if (trigger.contextKeys && context.currentVariables) {
            const hasContext = trigger.contextKeys.every(key =>
              key in context.currentVariables!
            );
            if (hasContext) {
              matched = true;
              confidence = 1.0;
            }
          }
          break;
      }

      if (matched && confidence > (bestMatch?.confidence || 0)) {
        bestMatch = { trigger, confidence };
      }
    }

    if (bestMatch) {
      return {
        triggered: true,
        matchedTrigger: bestMatch.trigger,
        confidence: bestMatch.confidence,
      };
    }

    return { triggered: false, confidence: 0 };
  }

  // 验证输入
  private validateInputs(
    rule: AIControlRule,
    context: AIRuleContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const inputRule of rule.inputRules) {
      // 检查必需性
      if (inputRule.required) {
        // 根据上下文检查输入是否存在
        if (context.currentVariables) {
          const value = context.currentVariables[inputRule.portId];
          if (value === undefined || value === null) {
            errors.push(`必需的输入端口 "${inputRule.portId}" 缺失`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // 检查限制
  private checkLimits(
    rule: AIControlRule,
    context: AIRuleContext
  ): { allowed: boolean; reason?: string } {
    // 检查执行次数限制
    if (rule.limits.maxTotalCalls > 0 && context.executionCount !== undefined) {
      if (context.executionCount >= rule.limits.maxTotalCalls) {
        return {
          allowed: false,
          reason: `已达到最大调用次数限制 (${rule.limits.maxTotalCalls})`,
        };
      }
    }

    // 检查AI角色限制
    if (rule.limits.allowedRoles && rule.limits.allowedRoles.length > 0) {
      if (context.aiRole && !rule.limits.allowedRoles.includes(context.aiRole)) {
        return {
          allowed: false,
          reason: `AI角色 "${context.aiRole}" 不在允许的角色列表中`,
        };
      }
    }

    return { allowed: true };
  }

  // 获取最佳匹配组件
  getBestMatch(): {
    component: PythonComponent | null;
    rule: AIControlRule | null;
    evaluation: AIRuleEvaluation | null;
  } {
    const evaluations = this.evaluateAllRules();
    
    // 筛选触发的规则
    const triggered = evaluations.filter(e => 
      e.triggered && 
      e.inputValidation?.valid && 
      e.limitsCheck?.allowed
    );

    if (triggered.length === 0) {
      return { component: null, rule: null, evaluation: null };
    }

    // 按置信度排序
    triggered.sort((a, b) => b.confidence - a.confidence);

    const best = triggered[0];
    const component = pythonRegistry.get(best.componentId);
    const rule = component?.aiControl.find(r => r.id === best.ruleId);

    return {
      component: component || null,
      rule: rule || null,
      evaluation: best,
    };
  }

  // 创建新规则
  createRule(overrides?: Partial<AIControlRule>): AIControlRule {
    return {
      id: uuidv4(),
      name: '新规则',
      description: '',
      priority: 5,
      enabled: true,
      triggers: [],
      inputRules: [],
      outputRules: [],
      limits: {
        maxCallsPerExecution: 10,
        maxTotalCalls: 0,
        requireUserPermission: false,
      },
      ...overrides,
    };
  }

  // 克隆规则
  cloneRule(rule: AIControlRule): AIControlRule {
    return {
      ...rule,
      id: uuidv4(),
      name: `${rule.name} (副本)`,
    };
  }

  // 导入规则模板
  importRuleTemplate(template: RuleTemplate): AIControlRule {
    const rule = this.createRule({
      name: template.name,
      description: template.description,
      priority: template.priority,
      triggers: template.triggers.map(t => ({ ...t })),
      inputRules: template.inputRules.map(i => ({ ...i })),
      outputRules: template.outputRules.map(o => ({ ...o })),
      limits: { ...template.limits },
    });

    return rule;
  }

  // 匹配用户意图
  async matchIntent(userInput: string): Promise<IntentType> {
    const input = userInput.toLowerCase();
    
    // 计算各类意图的匹配分数
    const scores: Record<string, number> = {};

    // 计算
    if (/计算|求解|统计|数学|公式/.test(input)) {
      scores[INTENT_TYPES.CALCULATION] = 0.9;
    }

    // 文本处理
    if (/处理|清洗|格式化|转换/.test(input)) {
      scores[INTENT_TYPES.TEXT_PROCESSING] = 0.9;
    }

    // 数据分析
    if (/分析|统计|趋势|数据/.test(input)) {
      scores[INTENT_TYPES.DATA_ANALYSIS] = 0.8;
    }

    // 网络搜索
    if (/搜索|查询|查找|找/.test(input)) {
      scores[INTENT_TYPES.WEB_SEARCH] = 0.7;
    }

    // 文件操作
    if (/读取|写入|保存|文件/.test(input)) {
      scores[INTENT_TYPES.FILE_OPERATION] = 0.8;
    }

    // 代码生成
    if (/代码|编程|编写|生成代码/.test(input)) {
      scores[INTENT_TYPES.CODE_GENERATION] = 0.9;
    }

    // 翻译
    if (/翻译|转成|翻译成/.test(input)) {
      scores[INTENT_TYPES.TRANSLATION] = 0.9;
    }

    // 总结
    if (/总结|概括|摘要/.test(input)) {
      scores[INTENT_TYPES.SUMMARIZATION] = 0.9;
    }

    // 问答
    if (/什么|如何|为什么|怎样|解释/.test(input)) {
      scores[INTENT_TYPES.QUESTION_ANSWERING] = 0.7;
    }

    // 找出最高分
    let bestIntent: IntentType = INTENT_TYPES.GENERAL;
    let bestScore = 0;

    for (const [intent, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent as IntentType;
      }
    }

    return bestIntent;
  }
}

// 规则模板接口
export interface RuleTemplate {
  name: string;
  description: string;
  priority: number;
  triggers: AIControlTrigger[];
  inputRules: InputRule[];
  outputRules: OutputRule[];
  limits: ControlLimits;
}

// 预定义规则模板
export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    name: '关键词触发',
    description: '当用户输入包含指定关键词时触发',
    priority: 5,
    triggers: [
      { type: 'keyword', pattern: '' },
    ],
    inputRules: [],
    outputRules: [],
    limits: {
      maxCallsPerExecution: 10,
      maxTotalCalls: 0,
      requireUserPermission: false,
    },
  },
  {
    name: '意图触发',
    description: '当检测到特定用户意图时触发',
    priority: 10,
    triggers: [
      { type: 'intent', intentType: 'general' },
    ],
    inputRules: [],
    outputRules: [],
    limits: {
      maxCallsPerExecution: 10,
      maxTotalCalls: 0,
      requireUserPermission: false,
    },
  },
  {
    name: '严格限制',
    description: '需要用户确认且有调用次数限制',
    priority: 15,
    triggers: [],
    inputRules: [],
    outputRules: [],
    limits: {
      maxCallsPerExecution: 5,
      maxTotalCalls: 100,
      requireUserPermission: true,
    },
  },
];

// 导出单例
export const aiRuleManager = new AIRuleManager();

