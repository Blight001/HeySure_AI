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
import { Brain, Clock, Trash2, BarChart3, Zap, ChevronDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import type { ModelConfig } from '../core/types';
import type { ThemeConfig } from '@/types/theme';
import { BaseNodeContainer } from './common/BaseNodeContainer';

// Token 统计信息
interface TokenStats {
  currentTokens: number;      // 当前对话消耗
  totalTokens: number;         // 累计消耗
  promptTokens: number;        // 累计提示词 tokens
  completionTokens: number;    // 累计回复 tokens
  requestCount: number;        // 对话次数
}

interface AINodeContentProps {
  label: string;
  modelId?: string;
  models?: ModelConfig[];
  tokenStats?: TokenStats;     // Token 统计信息
  useMemory?: boolean;          // 是否使用上下文记忆
  systemPrompt?: string;        // 系统提示词
  onToggleMemory?: (useMemory: boolean) => void; // 切换记忆模式的回调
  onClearHistory?: () => void;  // 清除历史消息的回调
  onModelChange?: (model: ModelConfig) => void;
  onPromptChange?: (prompt: string) => void; // 修改提示词的回调
  theme?: ThemeConfig;
  status?: string;
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
  systemPrompt = '',
  onToggleMemory,
  onClearHistory,
  onModelChange,
  onPromptChange,
  theme,
  status
}: AINodeContentProps) {
  const currentModel = models.find((model) => model.id === modelId);
  const displayLabel = currentModel?.name || label;
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(systemPrompt);

  const handleOpenPrompt = () => {
    setEditingPrompt(systemPrompt);
    setIsPromptOpen(true);
  };

  const handleSavePrompt = () => {
    onPromptChange?.(editingPrompt);
    setIsPromptOpen(false);
  };

  const headerLabel = models.length > 0 ? (
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
  );

  // 确定 title 属性，如果 displayLabel 是字符串则作为默认 title，否则使用 displayLabel（如果它也是字符串，虽然这里我们已经处理了 headerLabel）
  // 实际上 headerLabel 是 ReactNode，而 title 需要 string。
  // 我们应该使用 displayLabel (它是 string) 作为 title。
  const tooltipTitle = typeof displayLabel === 'string' ? displayLabel : undefined;

  const headerActions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={handleOpenPrompt}
        title="设置系统提示词"
        style={theme ? { color: theme.textColor } : undefined}
      >
        <Settings2 className="w-3 h-3" />
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
    </>
  );

  const footerContent = tokenStats && (
    <div className="space-y-1">
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
  );

  return (
    <BaseNodeContainer
      label={headerLabel}
      title={tooltipTitle}
      icon={<span className="text-lg">🤖</span>}
      theme={theme}
      status={status}
      headerActions={headerActions}
      footer={footerContent}
      width="w-64"
      statusLabels={{
        running: "生成中",
        thinking: "思考中"
      }}
    >
      {/* 上下文记忆切换按钮 */}
      <div className="flex items-center gap-1">
        <Button
          variant={useMemory ? "default" : "outline"}
          size="sm"
          className="h-6 px-2 text-xs gap-1 flex-1"
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
          className="h-6 px-2 text-xs gap-1 flex-1"
          onClick={() => onToggleMemory?.(false)}
          title="单次对话，不保存历史"
          style={theme ? (!useMemory ? { backgroundColor: theme.lineColor, color: '#fff' } : { borderColor: theme.nodeBorderColor, color: theme.textColor }) : undefined}
        >
          <Clock className="w-3 h-3" />
          <span>单次</span>
        </Button>
      </div>

      <Dialog open={isPromptOpen} onOpenChange={setIsPromptOpen}>
        <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>系统提示词 (System Prompt)</DialogTitle>
            <DialogDescription>
              设置 AI 的角色设定和行为准则，这将作为 system message 发送给模型。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="system-prompt">提示词内容</Label>
              <Textarea
                id="system-prompt"
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                placeholder="例如：你是一个专业的代码助手..."
                className="h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPromptOpen(false)}>取消</Button>
            <Button onClick={handleSavePrompt}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseNodeContainer>
  );
}
