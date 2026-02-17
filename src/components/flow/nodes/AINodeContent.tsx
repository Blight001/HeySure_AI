/**
 * HeySure AI - AI 节点内容组件
 * 用于 AI 对话类型的流程节点：
 * - 显示 AI 模型选择下拉菜单
 * - Token 使用统计显示
 * - 对话历史操作（清除历史）
 * - 运行状态显示
 * - 流式响应动画
 */
// ============ AI节点内容组件 ============
import { Brain, Clock, Trash2, BarChart3, Zap, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ModelConfig } from '../core/types';

// Token 统计信息
interface TokenStats {
  currentTokens: number;      // 当前对话消耗
  totalTokens: number;         // 累计消耗
  promptTokens: number;        // 累计提示词 tokens
  completionTokens: number;    // 累计回复 tokens
  requestCount: number;        // 对话次数
}

import type { ThemeConfig } from '@/types/theme';

interface AINodeContentProps {
  label: string;
  modelId?: string;
  models?: ModelConfig[];
  tokenStats?: TokenStats;     // Token 统计信息
  useMemory?: boolean;          // 是否使用上下文记忆
  onToggleMemory?: (useMemory: boolean) => void; // 切换记忆模式的回调
  onClearHistory?: () => void;  // 清除历史消息的回调
  onModelChange?: (model: ModelConfig) => void;
  theme?: ThemeConfig;
}

// 格式化大数字
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

export function AINodeContent({
  label,
  modelId,
  models = [],
  tokenStats,
  useMemory = true,
  onToggleMemory,
  onClearHistory,
  onModelChange,
  theme
}: AINodeContentProps) {
  const currentModel = models.find((model) => model.id === modelId);
  const displayLabel = currentModel?.name || label;

  return (
    <div className="flex flex-col gap-1 mb-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        {models.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="font-medium text-sm truncate inline-flex items-center gap-1 hover:text-primary"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{ color: theme?.textColor }}
              >
                <span className="truncate max-w-[140px]">{displayLabel}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
              {models.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onModelChange?.(model);
                  }}
                >
                  <span className="truncate">{model.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="font-medium text-sm truncate" style={{ color: theme?.textColor }}>{displayLabel}</span>
        )}
      </div>

      {/* 上下文记忆切换按钮 */}
      <div className="flex items-center gap-1 mt-1">
        <Button
          variant={useMemory ? "default" : "outline"}
          size="sm"
          className="h-6 px-2 text-xs gap-1"
          onClick={() => onToggleMemory?.(true)}
          title="开启上下文记忆"
          style={theme ? (useMemory ? { backgroundColor: theme.lineColor, color: '#fff' } : { borderColor: theme.nodeBorderColor, color: theme.textColor }) : undefined}
        >
          <Brain className="w-3 h-3" />
          <span>记忆</span>
        </Button>
        <Button
          variant={!useMemory ? "destructive" : "outline"}
          size="sm"
          className="h-6 px-2 text-xs gap-1"
          onClick={() => onToggleMemory?.(false)}
          title="单次对话，不保存历史"
          style={theme ? (!useMemory ? { backgroundColor: theme.lineColor, color: '#fff' } : { borderColor: theme.nodeBorderColor, color: theme.textColor }) : undefined}
        >
          <Clock className="w-3 h-3" />
          <span>单次</span>
        </Button>
        {onClearHistory && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onClearHistory}
            title="清除历史消息"
            style={theme ? { color: theme.textColor } : undefined}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Token 统计显示 */}
      {tokenStats && (
        <div className="mt-1 space-y-1">
          {/* 当前对话消耗 */}
          <div 
            className={`flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded ${!theme ? 'bg-primary/5 border border-primary/10' : ''}`}
            style={theme ? {
              backgroundColor: `${theme.lineColor}0D`, // 5% opacity
              borderColor: `${theme.lineColor}1A`, // 10% opacity
              borderWidth: '1px'
            } : undefined}
          >
            <Zap className={`w-3 h-3 ${!theme ? 'text-yellow-500' : ''}`} style={theme ? { color: theme.lineColor } : undefined} />
            <span className={!theme ? "text-muted-foreground" : ""} style={theme ? { color: theme.textColor, opacity: 0.7 } : undefined}>本次:</span>
            <span className={`font-medium ${!theme ? 'text-primary' : ''}`} style={theme ? { color: theme.textColor } : undefined}>{formatNumber(tokenStats.currentTokens)}</span>
          </div>

          {/* 累计统计 */}
          <div className="flex items-center gap-1.5">
            <div 
              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded flex-1 ${!theme ? 'bg-muted/50' : ''}`}
              style={theme ? { backgroundColor: `${theme.nodeBorderColor}33` } : undefined} // 20% opacity
            >
              <BarChart3 className={`w-3 h-3 ${!theme ? 'text-muted-foreground' : ''}`} style={theme ? { color: theme.textColor, opacity: 0.7 } : undefined} />
              <span className={!theme ? "text-muted-foreground" : ""} style={theme ? { color: theme.textColor, opacity: 0.7 } : undefined}>累计:</span>
              <span className="font-medium" style={theme ? { color: theme.textColor } : undefined}>{formatNumber(tokenStats.totalTokens)}</span>
            </div>
            <div className={`text-[10px] ${!theme ? 'text-muted-foreground' : ''}`} style={theme ? { color: theme.textColor, opacity: 0.7 } : undefined}>
              {tokenStats.requestCount}次
            </div>
          </div>

          {/* 分布详情 */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span 
              className={`px-1 rounded ${!theme ? 'bg-blue-50 text-blue-600' : ''}`}
              style={theme ? { backgroundColor: `${theme.lineColor}1A`, color: theme.lineColor } : undefined}
            >
              P: {formatNumber(tokenStats.promptTokens)}
            </span>
            <span 
              className={`px-1 rounded ${!theme ? 'bg-green-50 text-green-600' : ''}`}
              style={theme ? { backgroundColor: `${theme.nodeBorderColor}33`, color: theme.textColor } : undefined}
            >
              C: {formatNumber(tokenStats.completionTokens)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
