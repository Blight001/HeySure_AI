/**
 * HeySure AI - Electron 预加载脚本
 * 负责在渲染进程和主进程之间建立安全的通信桥梁
 * 通过 contextBridge 暴露安全的 API 给前端使用，包括：
 * - 对话/消息管理
 * - 模型/插件管理
 * - 流程/思维导图管理
 * - 文件系统操作
 * - Python 脚本执行
 * - 窗口控制
 */
import { contextBridge, ipcRenderer } from 'electron';

// 安全地暴露 API 给渲染进程
const electronAPI = {
  // 对话相关
  dialogCreate: (data: any) => ipcRenderer.invoke('dialog:create', data),
  dialogList: (data?: any) => ipcRenderer.invoke('dialog:list', data),
  dialogGet: (id: string) => ipcRenderer.invoke('dialog:get', { id }),
  dialogUpdate: (id: string, updates: any) => ipcRenderer.invoke('dialog:update', { id, updates }),
  dialogDelete: (id: string) => ipcRenderer.invoke('dialog:delete', { id }),
  dialogBatchDelete: (ids: string[]) => ipcRenderer.invoke('dialog:batchDelete', { ids }),
  dialogBatchUpdate: (ids: string[], updates: any) => ipcRenderer.invoke('dialog:batchUpdate', { ids, updates }),
  dialogOpenFile: (options: any) => ipcRenderer.invoke('dialog:openFile', options),

  // 消息相关
  messageSend: (data: any) => ipcRenderer.invoke('message:send', data),
  messageList: (data: any) => ipcRenderer.invoke('message:list', data),
  messageDelete: (data: any) => ipcRenderer.invoke('message:delete', data),
  messageUpdate: (data: any) => ipcRenderer.invoke('message:update', data),
  onAiStream: (callback: (event: any, data: any) => void) => ipcRenderer.on('ai:stream', callback),
  offAiStream: (callback: (event: any, data: any) => void) => ipcRenderer.removeListener('ai:stream', callback),
  removeAllAiStreamListeners: () => ipcRenderer.removeAllListeners('ai:stream'),

  // 模型配置相关
  modelList: () => ipcRenderer.invoke('model:list'),
  modelSave: (model: any) => ipcRenderer.invoke('model:save', model),
  modelDelete: (modelId: string) => ipcRenderer.invoke('model:delete', modelId),
  modelToggle: (modelId: string, enabled: boolean) => ipcRenderer.invoke('model:toggle', modelId, enabled),

  // AI 相关
  ai: {
    chat: (params: { modelId?: string; modelConfig?: any; messages: any[] }) => ipcRenderer.invoke('ai:chat', params),
  },

  // 流程相关
  flowSave: (data: any) => ipcRenderer.invoke('flow:save', data),
  flowGet: (id: string) => ipcRenderer.invoke('flow:get', { id }),
  flowList: (data?: any) => ipcRenderer.invoke('flow:list', data),
  flowDelete: (id: string) => ipcRenderer.invoke('flow:delete', { id }),
  flowExecute: (data: any) => ipcRenderer.invoke('flow:execute', data),
  flowGetCategories: () => ipcRenderer.invoke('flow:getCategories'),
  flowSaveCategories: (data: any) => ipcRenderer.invoke('flow:saveCategories', data),

  // 节点相关
  nodeSave: (nodeData: any) => ipcRenderer.invoke('node:save', nodeData),
  nodeGet: (nodeId: string) => ipcRenderer.invoke('node:get', { nodeId }),
  nodeDelete: (nodeId: string) => ipcRenderer.invoke('node:delete', { nodeId }),
  nodeList: () => ipcRenderer.invoke('node:list'),

  // 思维导图相关
  mindmapGetData: () => ipcRenderer.invoke('mindmap:getData'),
  mindmapSaveData: (data: any) => ipcRenderer.invoke('mindmap:saveData', data),
  mindmapSave: (mapData: any) => ipcRenderer.invoke('mindmap:save', mapData),
  mindmapGet: (mapId: string) => ipcRenderer.invoke('mindmap:get', mapId),
  mindmapList: () => ipcRenderer.invoke('mindmap:list'),
  mindmapDelete: (mapId: string) => ipcRenderer.invoke('mindmap:delete', mapId),
  mindmapAddCategory: (name: string) => ipcRenderer.invoke('mindmap:addCategory', name),
  mindmapDeleteCategory: (categoryId: string) => ipcRenderer.invoke('mindmap:deleteCategory', categoryId),
  mindmapSelectCategory: (categoryId: string) => ipcRenderer.invoke('mindmap:selectCategory', categoryId),

  // 设置相关
  settingsGet: (key?: string) => ipcRenderer.invoke('settings:get', { key }),
  settingsSet: (data: any) => ipcRenderer.invoke('settings:set', data),
  settingsReset: (keys?: string[]) => ipcRenderer.invoke('settings:reset', { keys }),

  // 文件系统相关
  fs: {
    readFile: (path: string, encoding?: string) => ipcRenderer.invoke('fs:readFile', path, encoding),
    writeFile: (path: string, data: string, encoding?: string) => ipcRenderer.invoke('fs:writeFile', path, data, encoding),
    readdir: (path: string) => ipcRenderer.invoke('fs:readdir', path),
    readdirStat: (path: string) => ipcRenderer.invoke('fs:readdirStat', path),
    getDrives: () => ipcRenderer.invoke('fs:getDrives'),
    mkdirSync: (path: string, options?: { recursive?: boolean }) => ipcRenderer.invoke('fs:mkdirSync', path, options),
    unlink: (path: string) => ipcRenderer.invoke('fs:unlink', path),
    existsSync: (path: string) => ipcRenderer.invoke('fs:existsSync', path),
    openFile: (path: string) => ipcRenderer.invoke('fs:openFile', path),
  },

  // 路径相关
  path: {
    join: (...paths: string[]) => ipcRenderer.invoke('path:join', ...paths),
    basename: (path: string, ext?: string) => ipcRenderer.invoke('path:basename', path, ext),
    dirname: (path: string) => ipcRenderer.invoke('path:dirname', path),
    extname: (path: string) => ipcRenderer.invoke('path:extname', path),
    resolve: (...paths: string[]) => ipcRenderer.invoke('path:resolve', ...paths),
    get appData() {
      return ipcRenderer.invoke('path:getAppData');
    },
    get userData() {
      return ipcRenderer.invoke('path:getUserData');
    },
  },

  // Python 脚本路径相关
  python: {
    getScriptDir: () => ipcRenderer.invoke('python:getScriptDir'),
    getModeDir: () => ipcRenderer.invoke('python:getModeDir'),
    getMainPyPath: () => ipcRenderer.invoke('python:getMainPyPath'),
  },

  // Python执行相关
  pythonExecute: (request: {
    filePath: string;
    functionName: string;
    inputs: Record<string, any>;
    config?: any;
  }) => ipcRenderer.invoke('python:execute', request),
  pythonAnalyze: (filePath: string) => ipcRenderer.invoke('python:analyze', filePath),

  // 监听事件
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },
  off: (channel: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      ipcRenderer.off(channel, (_, ...args) => callback(...args));
    } else {
      ipcRenderer.removeAllListeners(channel);
    }
  },
};

// 窗口控制 API
const windowControl = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  openDevTools: () => ipcRenderer.invoke('window:openDevTools'),
  closeDevTools: () => ipcRenderer.invoke('window:closeDevTools'),
  toggleDevTools: () => ipcRenderer.invoke('window:toggleDevTools'),
};

// 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },
  off: (channel: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      ipcRenderer.off(channel, (_, ...args) => callback(...args));
    } else {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  dialog: {
    create: (data: any) => ipcRenderer.invoke('dialog:create', data),
    list: (data?: any) => ipcRenderer.invoke('dialog:list', data),
    get: (id: string) => ipcRenderer.invoke('dialog:get', { id }),
    update: (id: string, updates: any) => ipcRenderer.invoke('dialog:update', { id, updates }),
    delete: (id: string) => ipcRenderer.invoke('dialog:delete', { id }),
    batchDelete: (ids: string[]) => ipcRenderer.invoke('dialog:batchDelete', { ids }),
    batchUpdate: (ids: string[], updates: any) => ipcRenderer.invoke('dialog:batchUpdate', { ids, updates }),
    showPrompt: (data: { label?: string; defaultValue?: string }) =>
      ipcRenderer.invoke('dialog:showPrompt', data),
  },
  model: {
    list: () => ipcRenderer.invoke('model:list'),
    save: (data: any) => ipcRenderer.invoke('model:save', data),
    delete: (id: string) => ipcRenderer.invoke('model:delete', id),
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke('model:toggle', id, enabled),
  },
  flow: {
    save: (data: any) => ipcRenderer.invoke('flow:save', data),
    get: (id: string) => ipcRenderer.invoke('flow:get', { id }),
    list: (data?: any) => ipcRenderer.invoke('flow:list', data),
    delete: (id: string) => ipcRenderer.invoke('flow:delete', { id }),
    execute: (data: any) => ipcRenderer.invoke('flow:execute', data),
    getCategories: () => ipcRenderer.invoke('flow:getCategories'),
    saveCategories: (data: any) => ipcRenderer.invoke('flow:saveCategories', data),
  },
  node: {
    save: (data: any) => ipcRenderer.invoke('node:save', data),
    get: (nodeId: string) => ipcRenderer.invoke('node:get', { nodeId }),
    delete: (nodeId: string) => ipcRenderer.invoke('node:delete', { nodeId }),
    list: () => ipcRenderer.invoke('node:list'),
  },
  mindmap: {
    getData: () => ipcRenderer.invoke('mindmap:getData'),
    saveData: (data: any) => ipcRenderer.invoke('mindmap:saveData', data),
    save: (mapData: any) => ipcRenderer.invoke('mindmap:save', mapData),
    get: (mapId: string) => ipcRenderer.invoke('mindmap:get', mapId),
    list: () => ipcRenderer.invoke('mindmap:list'),
    delete: (mapId: string) => ipcRenderer.invoke('mindmap:delete', mapId),
    addCategory: (name: string) => ipcRenderer.invoke('mindmap:addCategory', name),
    deleteCategory: (categoryId: string) => ipcRenderer.invoke('mindmap:deleteCategory', categoryId),
    selectCategory: (categoryId: string) => ipcRenderer.invoke('mindmap:selectCategory', categoryId),
  },
  settings: {
    get: (key?: string) => ipcRenderer.invoke('settings:get', { key }),
    set: (data: any) => ipcRenderer.invoke('settings:set', data),
    reset: (keys?: string[]) => ipcRenderer.invoke('settings:reset', { keys }),
  },
  devTools: {
    open: () => ipcRenderer.invoke('window:openDevTools'),
    close: () => ipcRenderer.invoke('window:closeDevTools'),
    toggle: () => ipcRenderer.invoke('window:toggleDevTools'),
  },
});
contextBridge.exposeInMainWorld('windowControl', windowControl);

// 文件对话框API
contextBridge.exposeInMainWorld('dialog', {
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  showMessageBox: (options: any) => ipcRenderer.invoke('dialog:showMessageBox', options),
  selectDirectory: (options?: any) => ipcRenderer.invoke('dialog:selectDirectory', options),
});