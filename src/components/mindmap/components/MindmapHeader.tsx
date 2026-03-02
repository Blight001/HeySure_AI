/**
 * HeySure AI - 思维导图头部组件
 * 负责思维导图的整体控制和配置，包括：
 * - 思维导图名称编辑
 * - 文件操作（新建、打开、保存、导出）
 * - 布局类型切换（思维导图、树形、垂直时间线等）
 * - 主题选择和自定义
 * - AI 权限设置（读取、编辑权限）
 * - 模型选择下拉菜单
 */
import React, { useRef, useState } from 'react';
import { 
  Folder, 
  ChevronDown, 
  Edit2, 
  Trash2, 
  FileText, 
  Plus,
  Save,
  Download,
  Upload,
  Layout,
  Palette,
  Shield,
  ShieldCheck,
  ShieldAlert,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useClickOutside } from '@/hooks/useClickOutside';
import { FileCategory, MindmapData, LayoutType, LocalModelConfig } from '../types';
import { layoutEngine } from '../services/layout-engine';
import { presetThemes } from '@/styles/theme';
import type { ThemeConfig } from '@/types/theme';

interface MindmapHeaderProps {
  currentTheme: ThemeConfig;
  mapName: string;
  mapId: string | null;
  categories: FileCategory[];
  selectedCategory: FileCategory | null;
  mapsInCategory: MindmapData[];
  showCategoryDropdown: boolean;
  setShowCategoryDropdown: (show: boolean) => void;
  showMapDropdown: boolean;
  setShowMapDropdown: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  handleCreateCategory: () => void;
  isEditingCategory: boolean;
  editingCategoryName: string;
  setEditingCategoryName: (name: string) => void;
  saveCategoryName: (id: string) => void;
  startEditCategory: (category: FileCategory) => void;
  handleDeleteCategory: (id: string) => void;
  handleSwitchCategory: (id: string) => void;
  handleCreateMap: () => void;
  handleDeleteMap: () => void;
  handleDeleteMapById: (id: string) => void;
  handleSwitchMap: (id: string) => void;
  editingListMapId: string | null;
  setEditingListMapId: (id: string | null) => void;
  editingListMapName: string;
  setEditingListMapName: (name: string) => void;
  handleSaveListMap: (id: string) => void;
  startEditListMap: (map: MindmapData) => void;
  newMapName: string;
  setNewMapName: (name: string) => void;

  // New props
  layoutType: LayoutType;
  onSwitchLayout: (type: LayoutType) => void;
  onSwitchTheme: (themeId: string) => void;
  selectedModelId: string;
  models: LocalModelConfig[];
  onSelectModel: (modelId: string) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allowReadMindmap: boolean;
  allowAiEdit: boolean;
  onAllowReadChange: (value: boolean) => void;
  onAllowEditChange: (value: boolean) => void;
  onSave: () => void;
}

export const MindmapHeader: React.FC<MindmapHeaderProps> = ({
  currentTheme,
  mapName,
  mapId,
  categories,
  selectedCategory,
  mapsInCategory,
  showCategoryDropdown,
  setShowCategoryDropdown,
  showMapDropdown,
  setShowMapDropdown,
  newCategoryName,
  setNewCategoryName,
  handleCreateCategory,
  isEditingCategory,
  editingCategoryName,
  setEditingCategoryName,
  saveCategoryName,
  startEditCategory,
  handleDeleteCategory,
  handleSwitchCategory,
  handleCreateMap,
  handleDeleteMap,
  handleDeleteMapById,
  handleSwitchMap,
  editingListMapId,
  setEditingListMapId,
  editingListMapName,
  setEditingListMapName,
  handleSaveListMap,
  startEditListMap,
  newMapName,
  setNewMapName,

  // New props
  layoutType,
  onSwitchLayout,
  onSwitchTheme,
  selectedModelId,
  models,
  onSelectModel,
  onExport,
  onImport,
  allowReadMindmap,
  allowAiEdit,
  onAllowReadChange,
  onAllowEditChange,
  onSave
}) => {
  const categoryDropdownRef = useClickOutside<HTMLDivElement>(() => setShowCategoryDropdown(false));
  const mapDropdownRef = useClickOutside<HTMLDivElement>(() => setShowMapDropdown(false));
  
  // New state for dropdowns
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showPermissionPanel, setShowPermissionPanel] = useState(false);

  const layoutDropdownRef = useClickOutside<HTMLDivElement>(() => setShowLayoutDropdown(false));
  const themeDropdownRef = useClickOutside<HTMLDivElement>(() => setShowThemeDropdown(false));
  const permissionPanelRef = useClickOutside<HTMLDivElement>(() => setShowPermissionPanel(false));

  // Delete alert state
  const [deleteAlert, setDeleteAlert] = useState<{ type: 'category' | 'map', id: string, name: string } | null>(null);

  const buttonStyle = {
    color: currentTheme.textColor,
    borderColor: currentTheme.nodeBorderColor,
    backgroundColor: currentTheme.nodeBackgroundColor
  };

  const getLayoutName = (type: LayoutType) => {
    const layout = layoutEngine.getAvailableLayouts().find(l => l.type === type);
    return layout ? layout.name : '未知布局';
  };

  return (
    <div 
      className="mindmap-toolbar mindmap-toolbar-top flex flex-wrap gap-2 p-2 items-center"
      style={{ 
        backgroundColor: currentTheme.backgroundColor, 
        borderBottomColor: currentTheme.gridColor 
      }}
    >
      {/* Left Group: Category & Map Selection */}
      <div className="flex items-center gap-2 mr-auto">
        {/* 分类选择器 */}
        <div className="category-selector relative" ref={categoryDropdownRef}>
          <button
            className="category-selector-button flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm"
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            style={buttonStyle}
          >
            <Folder size={16} />
            <span className="truncate max-w-[100px]">{selectedCategory?.name || '全部分类'}</span>
            <ChevronDown size={14} />
          </button>
          
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border z-50 p-2 max-h-[400px] overflow-y-auto">
               <div className="mb-2">
                <div className="text-xs font-medium text-gray-500 mb-1 px-2">新建分类</div>
                <div className="flex gap-1 px-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="分类名称"
                    className="flex-1 text-xs border rounded px-2 py-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => {
                    e.stopPropagation();
                    handleCreateCategory();
                  }}>
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-700 my-2" />
              {categories.map(category => (
                <div 
                  key={category.id} 
                  className={`group flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${selectedCategory?.id === category.id ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                  onClick={() => handleSwitchCategory(category.id)}
                >
                  {isEditingCategory && editingCategoryName && category.id === selectedCategory?.id ? ( // simplistic check, ideally need editingCategoryId
                     // Assuming editing happens on selected category or specific id passed
                     // For now just keep simple logic from original if possible or simplified
                     <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input 
                           value={editingCategoryName}
                           onChange={e => setEditingCategoryName(e.target.value)}
                           className="flex-1 text-xs border rounded px-1"
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveCategoryName(category.id)}>
                           <Save size={12} />
                        </Button>
                     </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                      <Folder size={14} className="flex-shrink-0" />
                      <span className="truncate text-sm">{category.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 text-muted-foreground hover:text-foreground" 
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditCategory(category);
                      }}
                    >
                      <Edit2 size={12} />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 text-red-500 hover:text-red-600" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteAlert({ type: 'category', id: category.id, name: category.name });
                      }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 导图选择器 */}
        <div className="map-selector relative" ref={mapDropdownRef}>
          <button
            className="map-selector-button flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm"
            onClick={() => setShowMapDropdown(!showMapDropdown)}
            style={buttonStyle}
          >
            <FileText size={16} />
            <span className="truncate max-w-[150px] font-medium">{mapName}</span>
            <ChevronDown size={14} />
          </button>
          
          {showMapDropdown && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 rounded-md shadow-lg border z-50 p-2 max-h-[400px] overflow-y-auto">
              <div className="mb-2">
                <div className="text-xs font-medium text-gray-500 mb-1 px-2">新建思维导图</div>
                <div className="flex gap-1 px-2 items-center">
                  <input
                    type="text"
                    value={newMapName}
                    onChange={(e) => setNewMapName(e.target.value)}
                    placeholder="输入文件名称"
                    className="flex-1 text-xs border rounded px-2 py-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button 
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateMap();
                      // Don't close dropdown immediately if we want to show success or keep context?
                      // User might want to switch to it. handleCreateMap does switch.
                      setShowMapDropdown(false);
                    }}
                  >
                    新建
                  </Button>
                </div>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-700 my-2" />
              {mapsInCategory.map(map => (
                <div 
                  key={map.id} 
                  className={`group flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${map.id === mapId ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                  onClick={() => handleSwitchMap(map.id)}
                >
                  {editingListMapId === map.id ? (
                    <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input 
                        value={editingListMapName}
                        onChange={e => setEditingListMapName(e.target.value)}
                        className="flex-1 text-xs border rounded px-1"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveListMap(map.id)}>
                        <Save size={12} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                      <span className="truncate text-sm">{map.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center opacity-0 group-hover:opacity-100">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6" 
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditListMap(map);
                      }}
                    >
                      <Edit2 size={12} />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 text-red-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteAlert({ type: 'map', id: map.id, name: map.name });
                      }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Group: Toolbar Items (Moved from MindmapToolbar) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

        {/* AI Model Selection */}
        <div className="w-32">
          <Select value={selectedModelId} onValueChange={onSelectModel}>
            <SelectTrigger className="h-8 text-xs" style={buttonStyle}>
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {models.map(model => (
                <SelectItem key={model.id} value={model.id} className="text-xs">
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* AI Permissions */}
        <div className="relative" ref={permissionPanelRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPermissionPanel(!showPermissionPanel)}
            className="flex items-center gap-1 h-8"
            style={buttonStyle}
            title="AI 权限设置"
          >
            {allowAiEdit ? (
              <ShieldCheck size={16} className="text-green-500" />
            ) : allowReadMindmap ? (
              <Shield size={16} className="text-yellow-500" />
            ) : (
              <ShieldAlert size={16} className="text-gray-400" />
            )}
            <span className="text-xs hidden sm:inline">AI权限</span>
          </Button>
          
          {showPermissionPanel && (
             <div
               className="absolute top-full right-0 mt-2 p-4 rounded-lg shadow-xl border min-w-[280px] z-50 bg-white dark:bg-gray-800"
               style={{ 
                 borderColor: currentTheme.nodeBorderColor,
               }}
             >
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-medium text-sm flex items-center gap-2">
                   <Shield size={16} />
                   AI 访问权限
                 </h3>
                 <Button
                   variant="ghost"
                   size="icon"
                   className="h-6 w-6"
                   onClick={() => setShowPermissionPanel(false)}
                 >
                   <X size={14} />
                 </Button>
               </div>
     
               <div className="space-y-4">
                 {/* 读取权限 */}
                 <div className="flex items-center justify-between">
                   <div className="flex-1 pr-3">
                     <div className="text-xs font-medium mb-0.5">读取思维导图</div>
                     <div className="text-[10px] opacity-70">
                       允许 AI 查看当前思维导图的结构和内容
                     </div>
                   </div>
                   <Switch
                     checked={allowReadMindmap}
                     onCheckedChange={(checked) => {
                       onAllowReadChange(checked);
                       if (!checked) {
                         onAllowEditChange(false);
                       }
                     }}
                   />
                 </div>
     
                 {/* 编辑权限 */}
                 <div className="flex items-center justify-between">
                   <div className="flex-1 pr-3">
                     <div className="text-xs font-medium mb-0.5">编辑思维导图</div>
                     <div className="text-[10px] opacity-70">
                       允许 AI 修改、添加或删除节点
                     </div>
                   </div>
                   <Switch
                     checked={allowAiEdit}
                     disabled={!allowReadMindmap}
                     onCheckedChange={onAllowEditChange}
                   />
                 </div>
               </div>
             </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

        {/* Layout Switch */}
        <div className="relative" ref={layoutDropdownRef}>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowLayoutDropdown(!showLayoutDropdown)} 
            title="切换布局" 
            style={buttonStyle}
            className="flex items-center gap-1 h-8"
          >
            <Layout size={16} />
            <span className="text-xs hidden sm:inline">{getLayoutName(layoutType)}</span>
            <ChevronDown size={12} />
          </Button>
          {showLayoutDropdown && (
            <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border z-50 py-1">
              {layoutEngine.getAvailableLayouts().map(layout => (
                <button
                  key={layout.type}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${layoutType === layout.type ? 'bg-gray-50 dark:bg-gray-900 font-medium' : ''}`}
                  onClick={() => {
                    onSwitchLayout(layout.type);
                    setShowLayoutDropdown(false);
                  }}
                >
                  {layout.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Switch */}
        <div className="relative" ref={themeDropdownRef}>
          <Button variant="outline" size="sm" onClick={() => setShowThemeDropdown(!showThemeDropdown)} title="切换主题" style={buttonStyle} className="h-8">
            <Palette size={16} />
          </Button>
          {showThemeDropdown && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border z-50 py-1">
              {Object.values(presetThemes).map(theme => (
                <button
                  key={theme.id}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => {
                    onSwitchTheme(theme.id);
                    setShowThemeDropdown(false);
                  }}
                >
                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: theme.backgroundColor }} />
                  {theme.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

        {/* Import/Export */}
        <div className="flex items-center gap-1">
          <div className="relative">
             <input
               type="file"
               accept=".json"
               onChange={onImport}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               title="导入"
             />
             <Button variant="outline" size="sm" style={buttonStyle} className="h-8">
               <Upload size={16} />
             </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onExport} title="导出" style={buttonStyle} className="h-8">
            <Download size={16} />
          </Button>
        </div>

        {/* Save Button */}
        <Button variant="outline" size="sm" onClick={onSave} title="保存" style={buttonStyle} className="h-8 gap-1">
          <Save size={16} />
          <span className="text-xs hidden sm:inline">保存</span>
        </Button>
      </div>

      {/* Shared Delete Alert Dialog */}
      <AlertDialog open={!!deleteAlert} onOpenChange={(open) => !open && setDeleteAlert(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteAlert?.type === 'category' ? '确认删除分类？' : '确认删除思维导图？'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAlert?.type === 'category' 
                ? `此操作将删除分类 "${deleteAlert?.name}" 及其包含的所有思维导图。此操作无法撤销。`
                : `此操作将永久删除思维导图 "${deleteAlert?.name}"。此操作无法撤销。`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteAlert?.type === 'category') {
                  handleDeleteCategory(deleteAlert.id);
                } else if (deleteAlert?.type === 'map') {
                  handleDeleteMapById(deleteAlert.id);
                }
                setDeleteAlert(null);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
