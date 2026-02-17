/**
 * HeySure AI - 连接状态提示组件
 * 注意：此组件已整合到 ShortcutHelp 中统一显示
 * 保留此文件仅用于类型导出，避免引用错误
 * 显示节点连接操作的状态提示：
 * - 提示用户点击输入端口完成连接
 * - 提示按 Esc 取消连接
 */
// ============ 连接状态提示组件 ============
// 注意：此组件已整合到 ShortcutHelp 中统一显示
// 保留此文件仅用于类型导出，避免引用错误
export interface ConnectionStatusTipProps {
  visible: boolean;
}

export function ConnectionStatusTip({ visible }: ConnectionStatusTipProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/90 text-white rounded-lg text-sm shadow-sm">
      <span className="animate-pulse">●</span>
      <span>点击输入端口完成连接，或按 Esc 取消</span>
    </div>
  );
}
