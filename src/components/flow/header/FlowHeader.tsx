/**
 * HeySure AI - 流程编辑器头部组件
 * 负责流程的整体控制和配置，包括：
 * - 流程名称编辑
 * - 文件操作（新建、打开、保存、导出）
 * - 流程执行控制（运行、暂停、停止）
 * - 流程分类管理
 * - 模型选择下拉菜单
 * - 主题选择
 * - AI 权限设置入口
 */
import { useState, useRef } from 'react';
import {
  Save, Play, Pause, Square, Folder, FileText, Trash2, Edit2, ChevronDown, Bot, Upload, Download, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClickOutside } from '@/hooks/useClickOutside';
import type { FlowCategory, FlowDefinition, LocalModelConfig } from '@/types/flow';
import { FlowAIPermissionPanel } from './FlowAIPermissionPanel';
import { presetThemes } from '@/styles/theme';
import type { ThemeConfig } from '@/types/theme';

interface FlowHeaderProps {
  flowName: string;
  flowId: string | null;
  categories: FlowCategory[];
  selectedCategory: FlowCategory | null;
  flowsInCategory: FlowDefinition[];
  flowStatus?: 'idle' | 'running' | 'paused';
  
  models?: LocalModelConfig[];
  selectedModelId?: string;
  onModelSelect?: (id: string) => void;
  allowReadFlow?: boolean;
  onToggleReadFlow?: (allow: boolean) => void;
  allowAiEdit?: boolean;
  onToggleAiEdit?: (allow: boolean) => void;
  allowAiAutoExecution?: boolean;
  onToggleAiAutoExecution?: (allow: boolean) => void;

  onCreateCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  onSwitchCategory: (id: string) => void;
  onRenameCategory: (id: string, name: string) => void;

  onCreateFlow: (name?: string) => void;
  onDeleteFlow: (id?: string) => void;
  onSwitchFlow: (id: string) => void;
  onRenameFlow: (id: string, name: string) => void;

  onExportFlow: () => void;
  onImportFlow: (file: File) => void;
  onSaveFlow: () => void;
  
  onRun: () => void;
  onStop?: () => void;

  onSwitchTheme?: (themeId: string) => void;
  theme?: ThemeConfig;
}

export function FlowHeader({
  flowName,
  flowId,
  categories,
  selectedCategory,
  flowsInCategory,
  flowStatus = 'idle',
  onCreateCategory,
  onDeleteCategory,
  onSwitchCategory,
  onRenameCategory,
  onCreateFlow,
  onDeleteFlow,
  onSwitchFlow,
  onRenameFlow,
  onExportFlow,
  onImportFlow,
  onSaveFlow,
  onRun,
  onStop,
  models,
  selectedModelId,
  onModelSelect,
  allowReadFlow,
  onToggleReadFlow,
  allowAiEdit,
  onToggleAiEdit,
  allowAiAutoExecution,
  onToggleAiAutoExecution,
  onSwitchTheme,
  theme
}: FlowHeaderProps) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showFlowDropdown, setShowFlowDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  
  const categoryDropdownRef = useClickOutside<HTMLDivElement>(() => setShowCategoryDropdown(false));
  const flowDropdownRef = useClickOutside<HTMLDivElement>(() => setShowFlowDropdown(false));
  const modelDropdownRef = useClickOutside<HTMLDivElement>(() => setShowModelDropdown(false));
  const themeDropdownRef = useClickOutside<HTMLDivElement>(() => setShowThemeDropdown(false));

  // Category editing state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  // Flow editing state (in list)
  const [newFlowName, setNewFlowName] = useState('');
  const [editingListFlowId, setEditingListFlowId] = useState<string | null>(null);
  const [editingListFlowName, setEditingListFlowName] = useState('');

  // 引用文件输入框
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateCategorySubmit = () => {
    onCreateCategory(newCategoryName);
    setNewCategoryName('');
  };

  const handleCreateFlowSubmit = () => {
    onCreateFlow(newFlowName);
    setNewFlowName('');
  };

  const startEditCategory = (category: FlowCategory) => {
    setEditingCategoryName(category.name);
    setIsEditingCategory(true);
  };

  const handleSaveCategoryName = (categoryId: string) => {
    onRenameCategory(categoryId, editingCategoryName);
    setIsEditingCategory(false);
  };

  // Flow renaming logic
  const startEditListFlow = (flow: FlowDefinition) => {
    setEditingListFlowId(flow.id);
    setEditingListFlowName(flow.name);
  };

  const handleSaveListFlow = (id: string) => {
    if (editingListFlowId === id) {
      onRenameFlow(id, editingListFlowName);
      setEditingListFlowId(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFlow(file);
    }
    // 清空以便下次能选同一个文件
    if (e.target) e.target.value = '';
  };

  const headerStyle = theme ? {
    backgroundColor: theme.backgroundColor,
    borderBottomColor: theme.gridColor,
    color: theme.textColor
  } : undefined;

  const buttonStyle = theme ? {
    color: theme.textColor,
    borderColor: theme.nodeBorderColor,
    backgroundColor: theme.nodeBackgroundColor
  } : undefined;

  return (
    <header 
      className="flex h-14 items-center justify-between border-b px-6 bg-background transition-colors duration-300"
      style={headerStyle}
    >
      <div className="flex items-center gap-3">
        {/* 分类选择器 */}
        <div className="relative" ref={categoryDropdownRef}>
          <button
            className="flex items-center gap-1.5 px-2 py-1 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            aria-label="选择分类"
            title="点击选择或管理分类"
            style={buttonStyle}
          >
            <Folder size={14} className={!theme ? "text-muted-foreground" : ""} />
            <span>{selectedCategory?.name || '选择分类'}</span>
            <ChevronDown size={12} className={!theme ? "text-muted-foreground" : ""} />
          </button>

          {showCategoryDropdown && (
            <div 
              className="absolute top-full left-0 mt-1 w-56 bg-card border rounded-lg shadow-lg z-50"
              style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
            >
              <div className="p-2 border-b" style={theme ? { borderColor: theme.nodeBorderColor } : undefined}>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="新分类名称"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategorySubmit()}
                    className="flex-1 px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    style={theme ? { backgroundColor: theme.backgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
                  />
                  <Button size="sm" onClick={handleCreateCategorySubmit} style={theme ? { backgroundColor: theme.lineColor, color: '#fff' } : undefined}>创建</Button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {categories.map(category => (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted ${
                      selectedCategory?.id === category.id ? 'bg-muted' : ''
                    }`}
                    style={theme ? { 
                      color: theme.textColor,
                      backgroundColor: selectedCategory?.id === category.id ? `${theme.lineColor}1A` : undefined
                    } : undefined}
                    onClick={() => {
                      onSwitchCategory(category.id);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    {isEditingCategory && selectedCategory?.id === category.id ? (
                      <input
                        type="text"
                        title="重命名分类"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onBlur={() => handleSaveCategoryName(category.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCategoryName(category.id);
                          if (e.key === 'Escape') setIsEditingCategory(false);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="flex-1 px-1 py-0.5 text-sm border rounded bg-background"
                        style={theme ? { backgroundColor: theme.backgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
                      />
                    ) : (
                      <span className="flex-1 truncate text-sm">{category.name}</span>
                    )}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditCategory(category); }}
                        className="p-1 hover:bg-muted-foreground/20 rounded"
                        title="重命名分类"
                      >
                        <Edit2 size={12} />
                      </button>
                      {categories.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteCategory(category.id); }}
                          className="p-1 hover:bg-red-100 text-red-500 rounded"
                          title="删除分类"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 流程选择器 */}
        <div className="relative" ref={flowDropdownRef}>
          <button
            className="flex items-center gap-1.5 px-2 py-1 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
            onClick={() => setShowFlowDropdown(!showFlowDropdown)}
            aria-label="选择流程"
            title="点击选择或管理流程"
            style={buttonStyle}
          >
            <FileText size={14} className={!theme ? "text-muted-foreground" : ""} />
            <span
              className="truncate max-w-32"
              title={flowName}
            >
              {flowName}
            </span>
            <ChevronDown size={12} className={!theme ? "text-muted-foreground" : ""} />
          </button>

          {showFlowDropdown && (
            <div 
              className="absolute top-full left-0 mt-1 w-64 bg-card border rounded-lg shadow-lg z-50"
              style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
            >
              <div className="p-2 border-b" style={theme ? { borderColor: theme.nodeBorderColor } : undefined}>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="新流程名称"
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFlowSubmit()}
                    className="flex-1 px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    style={theme ? { backgroundColor: theme.backgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
                  />
                  <Button size="sm" onClick={handleCreateFlowSubmit} style={theme ? { backgroundColor: theme.lineColor, color: '#fff' } : undefined}>创建</Button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {flowsInCategory.map(flow => (
                  <div
                    key={flow.id}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted ${
                      flowId === flow.id ? 'bg-muted' : ''
                    }`}
                    style={theme ? { 
                      color: theme.textColor,
                      backgroundColor: flowId === flow.id ? `${theme.lineColor}1A` : undefined // 10% opacity for selected
                    } : undefined}
                    onClick={() => {
                      onSwitchFlow(flow.id);
                      setShowFlowDropdown(false);
                    }}
                  >
                    {editingListFlowId === flow.id ? (
                      <input
                        type="text"
                        title="重命名流程"
                        placeholder="输入流程名称"
                        value={editingListFlowName}
                        onChange={(e) => setEditingListFlowName(e.target.value)}
                        onBlur={() => handleSaveListFlow(flow.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveListFlow(flow.id);
                          if (e.key === 'Escape') setEditingListFlowId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="flex-1 px-1 py-0.5 text-sm border rounded bg-background min-w-0"
                        style={theme ? { backgroundColor: theme.backgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
                      />
                    ) : (
                      <div className="flex items-center flex-1 min-w-0">
                        <FileText size={14} className="mr-2 text-muted-foreground shrink-0" />
                        <span className="truncate text-sm" title={flow.name}>{flow.name}</span>
                        {/* <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {flow.nodes.length}节点
                        </span> */}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                       <button
                        onClick={(e) => { e.stopPropagation(); startEditListFlow(flow); }}
                        className="p-1 hover:bg-muted-foreground/20 rounded"
                        title="重命名流程"
                      >
                        <Edit2 size={12} />
                      </button>
                      {flowsInCategory.length > 1 && (
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            onDeleteFlow(flow.id); 
                          }}
                          className="p-1 hover:bg-red-100 text-red-500 rounded"
                          title="删除流程"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* AI Model Selector */}
        {models && models.length > 0 && onModelSelect && (
          <div className="relative" ref={modelDropdownRef}>
            <button
              className="flex items-center gap-1.5 px-2 py-1 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              title="选择AI模型"
              style={buttonStyle}
            >
              <Bot size={14} className={!theme ? "text-muted-foreground" : ""} />
              <span className="max-w-[100px] truncate">
                {models.find(m => m.id === selectedModelId)?.name || '选择模型'}
              </span>
              <ChevronDown size={12} className={!theme ? "text-muted-foreground" : ""} />
            </button>

            {showModelDropdown && (
              <div 
                className="absolute top-full left-0 mt-1 w-48 bg-card border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
              >
                {models.map(model => (
                  <div
                    key={model.id}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                      selectedModelId === model.id ? 'bg-muted font-medium' : ''
                    }`}
                    style={theme ? { 
                      color: theme.textColor,
                      backgroundColor: selectedModelId === model.id ? `${theme.lineColor}1A` : undefined
                    } : undefined}
                    onClick={() => {
                      onModelSelect(model.id);
                      setShowModelDropdown(false);
                    }}
                  >
                    {model.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Permissions */}
        {allowReadFlow !== undefined && (
          <FlowAIPermissionPanel
            allowReadFlow={allowReadFlow}
            allowAiEdit={allowAiEdit || false}
            allowAiAutoExecution={allowAiAutoExecution || false}
            onAllowReadChange={onToggleReadFlow || (() => {})}
            onAllowEditChange={onToggleAiEdit || (() => {})}
            onAllowAutoExecutionChange={onToggleAiAutoExecution || (() => {})}
            theme={theme}
          />
        )}

        <div className="cursor-pointer">
          <Button variant="outline" size="sm" onClick={handleImportClick} title="导入" className="h-8" style={buttonStyle}>
            <Upload size={16} />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            title="选择要导入的JSON文件"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        {/* Theme Switch */}
        {onSwitchTheme && (
          <div className="relative" ref={themeDropdownRef}>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowThemeDropdown(!showThemeDropdown)} 
              title="切换主题" 
              className="h-8"
              style={buttonStyle}
            >
              <Palette size={16} />
            </Button>
            {showThemeDropdown && (
              <div 
                className="absolute top-full right-0 mt-1 w-48 bg-card border rounded-md shadow-lg z-50 py-1"
                style={theme ? { backgroundColor: theme.nodeBackgroundColor, borderColor: theme.nodeBorderColor, color: theme.textColor } : undefined}
              >
                {Object.values(presetThemes).map(t => (
                  <button
                    key={t.id}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    style={theme ? { color: theme.textColor } : undefined}
                    onClick={() => {
                      onSwitchTheme(t.id);
                      setShowThemeDropdown(false);
                    }}
                  >
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: t.backgroundColor }} />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Button variant="outline" size="sm" onClick={onExportFlow} title="导出" className="h-8" style={buttonStyle}>
          <Download size={16} />
        </Button>
        <Button variant="outline" size="sm" onClick={onSaveFlow} style={buttonStyle}>
          <Save size={16} className="mr-2" />
          保存
        </Button>
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant={flowStatus === 'running' ? "secondary" : "default"}
            onClick={onRun}
          >
            {flowStatus === 'running' ? (
              <>
                <Pause size={16} className="mr-2" />
                暂停
              </>
            ) : flowStatus === 'paused' ? (
              <>
                <Play size={16} className="mr-2" />
                继续
              </>
            ) : (
              <>
                <Play size={16} className="mr-2" />
                运行
              </>
            )}
          </Button>
          
          {flowStatus !== 'idle' && onStop && (
            <Button size="sm" variant="destructive" onClick={onStop}>
              <Square size={16} className="mr-2" />
              停止
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
