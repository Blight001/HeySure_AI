/**
 * HeySure AI - 流程待确认变更面板组件
 * 显示 AI 建议的流程修改，支持批量或单独确认：
 * - 待确认的节点添加/删除/修改列表
 * - 单个变更接受/拒绝操作
 * - 批量全部接受/拒绝操作
 * - 变更描述显示
 */
import { Check, X, CheckCheck, XCircle } from 'lucide-react';
import { PendingFlowChange } from '@/components/flow/hooks/useFlowAI';

interface PendingChangesPanelProps {
  pendingChanges: Record<string, PendingFlowChange>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export function PendingChangesPanel({
  pendingChanges,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll
}: PendingChangesPanelProps) {
  const changes = Object.values(pendingChanges);

  if (changes.length === 0) return null;

  return (
    <div 
      className="absolute top-20 right-4 z-50 w-80 bg-background/95 backdrop-blur-md border rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-200px)]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
        <h3 className="font-medium text-sm">AI 建议修改 ({changes.length})</h3>
        <div className="flex gap-1">
          <button
            onClick={onAcceptAll}
            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 rounded"
            title="全部接受"
          >
            <CheckCheck size={16} />
          </button>
          <button
            onClick={onRejectAll}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded"
            title="全部拒绝"
          >
            <XCircle size={16} />
          </button>
        </div>
      </div>
      
      <div className="overflow-y-auto p-2 space-y-2">
        {changes.map((change) => (
          <div key={change.id} className="p-3 bg-card border rounded-md text-sm shadow-sm">
            <div className="mb-2 text-foreground/90">{change.description}</div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => onReject(change.id)}
                className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-destructive/10 text-destructive text-xs rounded transition-colors"
              >
                <X size={12} /> 拒绝
              </button>
              <button
                onClick={() => onAccept(change.id)}
                className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs rounded transition-colors"
              >
                <Check size={12} /> 接受
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
