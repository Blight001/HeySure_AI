/**
 * HeySure AI - 逻辑节点内容组件
 * 用于条件分支、并行执行、聚合汇总等逻辑节点：
 * - 条件分支（condition）：根据条件选择不同分支
 * - 并行执行（parallel）：同时执行多个分支
 * - 聚合汇总（aggregate）：合并多个分支的结果
 */
// ============ 逻辑节点内容组件 ============
import type { ThemeConfig } from '@/types/theme';

interface LogicNodeContentProps {
  type: 'condition' | 'parallel' | 'aggregate';
  label: string;
  theme?: ThemeConfig;
}

export function LogicNodeContent({ type, label, theme }: LogicNodeContentProps) {
  const icons: Record<string, string> = {
    condition: '🔀',
    parallel: '⚡',
    aggregate: '📥'
  };

  return (
    <div className="flex items-center gap-2 mb-2" style={theme ? { color: theme.textColor } : undefined}>
      <span className="text-lg">{icons[type]}</span>
      <span className="font-medium text-sm truncate">{label}</span>
    </div>
  );
}

