/**
 * HeySure AI - 公共类型定义
 * 定义应用通用的数据结构：
 * - UserSettings: 用户设置
 * - ToastConfig: 通知配置
 * - ModalConfig: 模态框配置
 * - SelectOption: 下拉选项
 * - SearchResult: 搜索结果
 * - KeyboardShortcut: 键盘快捷键
 * - ProgressInfo: 进度信息
 * - PaginatedResult: 分页结果
 * - APIResponse: API响应格式
 * - EventCallback/Disposable: 事件和资源释放
 */
// ============ 公共类型 ============
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontSize: number;
  autoSave: boolean;
  enableMarkdownPreview: boolean;
  enableCodeHighlight: boolean;
  defaultModel?: string;
  temperature: number;
  maxTokens: number;
  shortcuts: Record<string, string>;
}

export interface ToastConfig {
  title: string;
  description?: string;
  duration?: number;
  variant?: 'default' | 'destructive' | 'success';
  action?: ToastAction;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ModalConfig {
  open: boolean;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
  onClose?: () => void;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SearchResult {
  id: string;
  type: 'dialog' | 'message' | 'flow';
  title: string;
  description?: string;
  icon?: string;
  timestamp?: number;
  onClick: () => void;
}

export interface KeyboardShortcut {
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: () => void;
  description: string;
}

export interface ProgressInfo {
  total: number;
  current: number;
  percentage: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    timestamp: number;
    requestId: string;
  };
}

export interface EventCallback<T = void> {
  (event: T): void;
}

export interface Disposable {
  dispose(): void;
}

