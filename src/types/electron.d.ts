/**
 * Electron 渲染进程类型扩展
 */

interface ElectronDialogAPI {
  create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  list: (data?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  get: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  update: (id: string, updates: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  delete: (id: string) => Promise<{ success: boolean; error?: string }>;
  batchDelete: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  batchUpdate: (ids: string[], updates: any) => Promise<{ success: boolean; error?: string }>;
  showPrompt: (data: { label?: string; defaultValue?: string }) => Promise<{ success: boolean; data?: string | null; error?: string }>;
}

// 文件对话框选项类型
interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: string[];
}

// 文件对话框返回结果类型
interface FileDialogResult {
  success: boolean;
  canceled: boolean;
  filePaths?: string[];
  filePath?: string;
  error?: string;
}

// 消息框选项类型
interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

// 消息框返回结果类型
interface MessageBoxResult {
  success: boolean;
  response: number;
  checkboxChecked: boolean;
  error?: string;
}

interface Window {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => void;
    off: (channel: string, callback?: (...args: any[]) => void) => void;
    dialog: ElectronDialogAPI;
    model: {
      list: () => Promise<any>;
      save: (data: any) => Promise<any>;
      delete: (id: string) => Promise<any>;
      toggle: (id: string, enabled: boolean) => Promise<any>;
    };
    flow: {
      save: (data: any) => Promise<any>;
      get: (id: string) => Promise<any>;
      list: (data?: any) => Promise<any>;
      delete: (id: string) => Promise<any>;
      execute: (data: any) => Promise<any>;
      getCategories: () => Promise<any>;
      saveCategories: (data: any) => Promise<any>;
    };
    node: {
      save: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>;
      get: (nodeId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      delete: (nodeId: string) => Promise<{ success: boolean; error?: string }>;
      list: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
    };
    settings: {
      get: (key?: string) => Promise<any>;
      set: (data: any) => Promise<any>;
      reset: (keys?: string[]) => Promise<any>;
    };
    devTools: {
      open: () => Promise<void>;
      close: () => Promise<void>;
      toggle: () => Promise<void>;
    };
  };
  electronAPI: {
    dialogCreate: (data: any) => Promise<any>;
    dialogList: (data?: any) => Promise<any>;
    dialogGet: (id: string) => Promise<any>;
    dialogUpdate: (id: string, updates: any) => Promise<any>;
    dialogDelete: (id: string) => Promise<any>;
    dialogBatchDelete: (ids: string[]) => Promise<any>;
    dialogBatchUpdate: (ids: string[], updates: any) => Promise<any>;
    dialogOpenFile: (options: any) => Promise<any>;
    messageSend: (data: { dialogId: string; content: string; aiIds?: string[]; id?: string }) => Promise<any>;
    messageList: (data: any) => Promise<any>;
    messageDelete: (data: any) => Promise<any>;
    messageUpdate: (data: any) => Promise<any>;
    onAiStream: (callback: (event: any, data: any) => void) => void;
    offAiStream: (callback: (event: any, data: any) => void) => void;
    removeAllAiStreamListeners: () => void;
    modelList: () => Promise<any>;
    modelSave: (model: any) => Promise<any>;
    modelDelete: (modelId: string) => Promise<any>;
    modelToggle: (modelId: string, enabled: boolean) => Promise<any>;
    ai: {
      chat: (params: { modelId?: string; modelConfig?: any; messages: any[] }) => Promise<{ success: boolean; data?: string; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }; error?: string }>;
    };
    // 流程相关
    flowSave: (data: any) => Promise<any>;
    flowGet: (id: string) => Promise<any>;
    flowList: (data?: any) => Promise<any>;
    flowDelete: (id: string) => Promise<any>;
    flowExecute: (data: any) => Promise<any>;
    flowGetCategories: () => Promise<any>;
    flowSaveCategories: (data: any) => Promise<any>;
    // 节点相关
    nodeSave: (nodeData: any) => Promise<{ success: boolean; path?: string; error?: string }>;
    nodeGet: (nodeId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    nodeDelete: (nodeId: string) => Promise<{ success: boolean; error?: string }>;
    nodeList: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
    settingsGet: (key?: string) => Promise<any>;
    settingsSet: (data: any) => Promise<any>;
    settingsReset: (keys?: string[]) => Promise<any>;
    // 思维导图相关
    mindmapGetData: () => Promise<any>;
    mindmapSaveData: (data: any) => Promise<boolean>;
    mindmapSave: (mapData: any) => Promise<boolean>;
    mindmapGet: (mapId: string) => Promise<any>;
    mindmapList: () => Promise<any[]>;
    mindmapDelete: (mapId: string) => Promise<boolean>;
    mindmapAddCategory: (name: string) => Promise<any>;
    mindmapDeleteCategory: (categoryId: string) => Promise<boolean>;
    mindmapSelectCategory: (categoryId: string) => Promise<boolean>;
    // 文件系统相关
    fs: {
      readFile: (path: string, encoding?: string) => Promise<string>;
      writeFile: (path: string, data: string, encoding?: string) => Promise<void>;
      readdir: (path: string) => Promise<string[]>;
      mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
      unlink: (path: string) => Promise<void>;
      existsSync: (path: string) => boolean;
    };
    path: {
      join: (...paths: string[]) => string;
      basename: (path: string, ext?: string) => string;
      dirname: (path: string) => string;
      extname: (path: string) => string;
      resolve: (...paths: string[]) => string;
      appData: string;
      userData: string;
    };
    // Python执行相关
    pythonExecute: (request: {
      filePath: string;
      functionName: string;
      inputs: Record<string, any>;
      config?: any;
    }) => Promise<{ success: boolean; output?: any; error?: string; logs?: string }>;
    pythonAnalyze: (filePath: string) => Promise<{
      success: boolean;
      functions?: Array<{
        name: string;
        description: string;
        parameters: Array<{
          name: string;
          type: string;
          description: string;
          defaultValue?: any;
          required: boolean;
        }>;
        returns: {
          type: string;
          description: string;
        };
      }>;
      error?: string;
    }>;
    // Python 脚本路径相关
    python: {
      getScriptDir: () => Promise<string>;
      getModeDir: () => Promise<string>;
      getMainPyPath: () => Promise<string>;
    };
    on: (channel: string, callback: (...args: any[]) => void) => void;
    off: (channel: string, callback?: (...args: any[]) => void) => void;
  };
  dialog: {
    // 对话管理API
    create: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    list: (data?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    get: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    update: (id: string, updates: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    delete: (id: string) => Promise<{ success: boolean; error?: string }>;
    showPrompt: (data: { label?: string; defaultValue?: string }) => Promise<{ success: boolean; data?: string | null; error?: string }>;
    // 文件对话框API
    showOpenDialog: (options: FileDialogOptions) => Promise<FileDialogResult>;
    showSaveDialog: (options: FileDialogOptions) => Promise<FileDialogResult>;
    showMessageBox: (options: MessageBoxOptions) => Promise<MessageBoxResult>;
    selectDirectory: (options?: FileDialogOptions) => Promise<FileDialogResult>;
  };
  fileSystem: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, data: string) => Promise<void>;
    selectDirectory: () => Promise<string | null>;
  };
}

