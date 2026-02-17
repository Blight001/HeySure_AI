/**
 * HeySure AI - Python 节点内容组件
 * 用于执行 Python 脚本的流程节点：
 * - 显示脚本名称
 * - 统一输入/独立输入模式切换
 * - 执行状态显示
 * - 输入/输出变量显示
 */
// ============ Python节点内容组件 ============
import type { ThemeConfig } from '@/types/theme';

interface PythonNodeContentProps {
  label: string;
  unifiedInput?: boolean;
  onToggleMode?: () => void;
  theme?: ThemeConfig;
}

export function PythonNodeContent({ label, unifiedInput, onToggleMode, theme }: PythonNodeContentProps) {
  return (
    <div className="flex flex-col items-start gap-1 w-full">
      <div className="flex items-center gap-2">
        <span className="text-lg">🐍</span>
        <span className="font-medium text-sm truncate" style={{ color: theme?.textColor }}>{label}</span>
      </div>

      {/* 模式切换按钮 */}
      {onToggleMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMode();
          }}
          className="text-xs px-2 py-0.5 rounded border bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1"
          style={theme ? { 
            color: theme.textColor, 
            borderColor: theme.nodeBorderColor,
            backgroundColor: theme.nodeBackgroundColor 
          } : undefined}
          title="切换输入模式"
        >
          {unifiedInput ? (
            <>
              <span>📦</span>
              <span>统一输入</span>
            </>
          ) : (
            <>
              <span>🔀</span>
              <span>多参数</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

