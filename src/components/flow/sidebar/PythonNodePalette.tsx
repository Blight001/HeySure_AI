/**
 * HeySure AI - Python 节点面板组件
 * 流程编辑器侧边栏中的 Python 节点分类：
 * - Python 脚本列表
 * - 脚本函数组件列表
 * - 脚本刷新功能
 * - 添加新脚本入口
 * - 脚本管理器入口
 * - 拖拽添加 Python 节点
 */
// ============ Python节点面板组件 ============
import { useState } from 'react';
import {
  Plus, Settings, ChevronRight, ChevronDown,
  FileCode, MoreHorizontal, Edit2, Trash2
} from 'lucide-react';
import type { PythonComponent, PythonScriptConfig } from '@/types/flow';
import type { DragData } from '../core/types';

interface PythonNodePaletteProps {
  scripts: PythonScriptConfig[];
  scriptComponents: PythonComponent[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onAddScript: () => void;
  onOpenManager: () => void;
  onEditScript: (script: PythonScriptConfig) => void;
  onDeleteScript: (scriptId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onAddNodeToCanvas: (component: PythonComponent) => void;
  onDragStart?: (e: React.DragEvent, data: DragData) => void;
}

export function PythonNodePalette({
  scripts,
  scriptComponents,
  isRefreshing,
  onRefresh,
  onAddScript,
  onOpenManager,
  onEditScript,
  onDeleteScript,
  onDeleteComponent,
  onAddNodeToCanvas,
  onDragStart: externalDragStart
}: PythonNodePaletteProps) {
  const [sectionExpanded, setSectionExpanded] = useState(true);
  const [expandedScripts, setExpandedScripts] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const toggleScript = (scriptId: string) => {
    setExpandedScripts(prev =>
      prev.includes(scriptId)
        ? prev.filter(id => id !== scriptId)
        : [...prev, scriptId]
    );
  };

  const getScriptComponents = (scriptId: string): PythonComponent[] => {
    return scriptComponents.filter(c => c.id.startsWith(`${scriptId}_`));
  };

  const handleDragStart = (e: React.DragEvent, data: DragData) => {
    if (externalDragStart) {
      externalDragStart(e, data);
    }
  };

  // 未使用但保留的属性，用于类型兼容性
  // isRefreshing 和 onRefresh 由 NodePalette 传递，但在 PythonNodePalette 中不需要单独的刷新按钮

  if (scripts.length === 0) {
    return (
      <>
        <button
          type="button"
          className="text-xs text-muted-foreground px-2 py-1 mt-4 flex items-center gap-1 w-full"
          onClick={() => setSectionExpanded((prev) => !prev)}
        >
          {sectionExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Python 节点</span>
        </button>
        {sectionExpanded && (
          <>
            <button
              onClick={onOpenManager}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors text-muted-foreground mt-1"
            >
              <Settings size={16} />
              <span>管理脚本</span>
            </button>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="text-xs text-muted-foreground px-2 py-1 mt-4 flex items-center gap-1 w-full"
        onClick={() => setSectionExpanded((prev) => !prev)}
      >
        {sectionExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>Python 节点</span>
      </button>

      {sectionExpanded && scripts.map(script => {
        const components = getScriptComponents(script.id);
        const isExpanded = expandedScripts.includes(script.id);

        return (
          <div key={script.id} className="mb-1">
            {/* 脚本头 - 可拖拽 */}
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-accent rounded-lg cursor-pointer group"
              onClick={() => toggleScript(script.id)}
              draggable
              onMouseDown={(e) => e.stopPropagation()}
              onDragStart={(e) => handleDragStart(e, {
                type: 'python',
                label: script.name,
                icon: '🐍'
              })}
            >
              {isExpanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
              <FileCode size={14} className="text-blue-500 shrink-0" />
              <span className="truncate flex-1 font-medium">{script.name}</span>

              {/* 脚本菜单 */}
              <div className="relative">
                <button
                  title="脚本操作"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === script.id ? null : script.id);
                  }}
                  className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  <MoreHorizontal size={14} />
                </button>

                {openMenuId === script.id && (
                  <div
                    className="absolute right-0 top-full mt-1 w-32 bg-popover border rounded-lg shadow-lg py-1 z-50"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        onEditScript(script);
                        setOpenMenuId(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Edit2 size={14} />
                      <span>编辑脚本</span>
                    </button>
                    <button
                      onClick={() => {
                        onDeleteScript(script.id);
                        setOpenMenuId(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      <span>删除脚本</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 脚本下的组件列表 - 可拖拽 */}
            {isExpanded && (
              <div className="pl-4 space-y-0.5 mt-0.5 border-l-2 border-muted ml-2.5">
                {components.map(component => (
                  <div key={component.id} className="relative group pl-2">
                    <div
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
                      draggable
                      onMouseDown={(e) => e.stopPropagation()}
                      onDragStart={(e) => handleDragStart(e, {
                        type: 'python',
                        component,
                        label: component.name.split(' - ').pop() || component.name,
                        icon: '🐍'
                      })}
                      onClick={() => onAddNodeToCanvas(component)}
                    >
                      <span>🐍</span>
                      <span className="flex-1 text-left truncate text-xs" title={component.name}>
                        {component.name.split(' - ').pop()}
                      </span>

                      {/* 组件菜单 */}
                      <div className="relative">
                        <button
                          title="更多操作"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === component.id ? null : component.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {openMenuId === component.id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-32 bg-popover border rounded-lg shadow-lg py-1 z-50"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                onDeleteComponent(component.id);
                                setOpenMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              <span>移除函数</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {components.length === 0 && (
                  <div className="pl-2 py-1 text-xs text-muted-foreground">
                    无可用函数
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {sectionExpanded && (
        <>
          <button
            onClick={onOpenManager}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors text-muted-foreground mt-1"
          >
            <Settings size={16} />
            <span>管理脚本</span>
          </button>
        </>
      )}
    </>
  );
}

