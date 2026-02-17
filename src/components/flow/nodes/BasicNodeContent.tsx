/**
 * HeySure AI - 基础节点内容组件
 * 用于开始、结束等基础类型的流程节点：
 * - 显示节点图标和标签
 * - 主题颜色支持
 * - 简单的静态内容展示
 */
// ============ 基础节点内容组件 ============
import { NODE_TYPE_ICONS } from '../core/constants';
import type { ThemeConfig } from '@/types/theme';

interface BasicNodeContentProps {
  type: string;
  label: string;
  icon?: string;
  theme?: ThemeConfig;
}

export function BasicNodeContent({ type, label, icon, theme }: BasicNodeContentProps) {
  const displayIcon = icon || NODE_TYPE_ICONS[type] || '📦';

  return (
    <div className="flex items-center gap-2 mb-2" style={theme ? { color: theme.textColor } : undefined}>
      <span className="text-lg">{displayIcon}</span>
      <span className="font-medium text-sm truncate">{label}</span>
    </div>
  );
}

