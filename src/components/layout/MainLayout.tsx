/**
 * HeySure AI - 主布局组件
 * 负责应用程序的整体布局结构，包含：
 * - 左侧边栏（对话列表、导航菜单）
 * - 主内容区域（路由页面渲染）
 * - 窗口标题栏
 * - 对话管理功能（创建、删除、置顶、批量操作）
 * - 响应式移动端菜单支持
 */
import { useEffect, useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageCircle,
  GitBranch,
  Puzzle,
  Settings,
  Plus,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Pin,
  PinOff,
  Trash2,
  MoreHorizontal,
  Bell,
  Map,
  ListChecks,
  Check,
  Book,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDialogStore, useUiStore, useSettingsStore, useMessageStore } from '@/stores';
import { useToast } from '@/hooks/use-toast';
import { cn, applyTheme, applyFontSize } from '@/utils/helpers';
import { WindowTitleBar } from './WindowTitleBar';
import FlowEditorPage from '@/pages/FlowEditor';
import MindmapPage from '@/pages/Mindmap';

const navItems = [
  { path: '/chat', icon: MessageCircle, label: '对话' },
  { path: '/plugins', icon: Puzzle, label: '模型配置' },
  { path: '/flow', icon: GitBranch, label: '操作流程' },
  { path: '/mindmap', icon: Map, label: '思维导图' },
  { path: '/settings', icon: Settings, label: '设置' },
  { path: '/notifications', icon: Bell, label: '通知' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dialogs, setDialogs, currentDialogId, setCurrentDialog, removeDialog } = useDialogStore();
  const { sidebarCollapsed, toggleSidebarCollapsed, chatMode, setChatMode } = useUiStore();
  const { fontSize } = useSettingsStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [dialogToDelete, setDialogToDelete] = useState<string | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedDialogIds, setSelectedDialogIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadDialogs = useCallback(async () => {
    try {
      console.log('Loading dialogs...');
      const result = await window.ipcRenderer.dialog.list();
      console.log('Dialogs loaded:', result);
      if (result.success) {
        const dialogList = result.data || [];
        setDialogs(dialogList);

        // 如果当前没有选中对话且存在对话列表，自动选择最近一次更新的对话
        // 仅当位于根路径或对话页面时才自动跳转，避免在其他页面（如思维导图）时被强制跳转
        // 另外，如果是思维导图创建的浮窗对话（以 floating_ 开头），也不自动跳转
        const isChatOrRoot = location.pathname === '/' || location.pathname.startsWith('/chat');
        if (!currentDialogId && dialogList.length > 0 && isChatOrRoot) {
          const mostRecentDialog = dialogList[0]; // 列表已按置顶和时间排序，第一个就是最近更新的
          
          // 如果是浮窗对话，不自动跳转
          // 包括思维导图浮窗 (floating_) 和操作流程浮窗 (flow_floating_)
          if (mostRecentDialog.id.startsWith('floating_') || mostRecentDialog.id.startsWith('flow_floating_')) {
            console.log('Skipping auto-jump for floating dialog:', mostRecentDialog.id);
            return;
          }

          setCurrentDialog(mostRecentDialog.id);
          navigate(`/chat/${mostRecentDialog.id}`);
          console.log('Auto-selected most recent dialog:', mostRecentDialog.id);
        }
      }
    } catch (error) {
      console.error('Failed to load dialogs:', error);
      toast({
        title: '加载失败',
        description: '无法加载对话列表',
        variant: 'destructive',
      });
    }
  }, [setDialogs, toast, currentDialogId, setCurrentDialog, navigate, location.pathname]);

  useEffect(() => {
    loadDialogs();
  }, [loadDialogs]);

  // 监听对话变更事件，实现实时同步
  useEffect(() => {
    const handleDialogChange = () => {
      console.log('Received dialog:changed event, reloading dialogs...');
      loadDialogs();
    };

    if (window.ipcRenderer && window.ipcRenderer.on) {
      window.ipcRenderer.on('dialog:changed', handleDialogChange);
    }

    return () => {
      if (window.ipcRenderer && window.ipcRenderer.off) {
        window.ipcRenderer.off('dialog:changed', handleDialogChange);
      }
    };
  }, [loadDialogs]);

  // 初始化时应用字体大小
  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  const handleCreateDialog = async () => {
    if (isCreating) return;
    setIsCreating(true);
    // 切换回默认模式
    setChatMode('default');
    try {
      console.log('Creating new dialog...');
      const newDialog = await window.ipcRenderer.dialog.create({
        title: '新对话',
        type: 'single',
      });
      console.log('Dialog created:', newDialog);
      if (!newDialog.success) {
        throw new Error(newDialog.error || '创建对话失败');
      }
      const dialogData = newDialog.data;
      setCurrentDialog(dialogData.id);
      setDialogs([dialogData, ...(Array.isArray(dialogs) ? dialogs : [])]);
      navigate(`/chat/${dialogData.id}`);
      toast({
        title: '对话已创建',
        description: '开始新的对话',
      });
    } catch (error: any) {
      console.error('Failed to create dialog:', error);
      toast({
        title: '创建失败',
        description: error.message || '无法创建新对话，请重试',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectDialog = async (dialogId: string) => {
    if (isBatchMode) {
      const newSelected = new Set(selectedDialogIds);
      if (newSelected.has(dialogId)) {
        newSelected.delete(dialogId);
      } else {
        newSelected.add(dialogId);
      }
      setSelectedDialogIds(newSelected);
      return;
    }

    // 在切换对话前，检查当前对话是否为空，如果是则删除
    if (currentDialogId) {
      const dialogStore = useDialogStore.getState();
      const messageStore = useMessageStore.getState();
      const messages = messageStore.messages.filter((m: any) => m.dialogId === currentDialogId);
      const hasUserMessage = messages.some((m: any) => m.role === 'user');

      if (dialogStore.isNewEmptyDialog(currentDialogId, hasUserMessage)) {
        try {
          await window.ipcRenderer.dialog.delete(currentDialogId);
          dialogStore.removeDialog(currentDialogId);
          console.log('已自动删除空对话:', currentDialogId);
        } catch (error) {
          console.error('删除空对话失败:', error);
        }
      }
    }

    // 切换回默认模式
    setChatMode('default');
    setCurrentDialog(dialogId);
    navigate(`/chat/${dialogId}`);
  };

  const handleTogglePin = async (e: React.MouseEvent, dialog: any) => {
    e.stopPropagation();
    // 使用 setTimeout 避免阻塞 UI，确保菜单能正常关闭
    setTimeout(async () => {
      try {
        const result = await window.ipcRenderer.dialog.update(dialog.id, {
          isPinned: !dialog.isPinned,
        });
        if (result.success) {
          // 直接更新本地状态，不需要手动排序，因为列表渲染时可以重新加载或由后端排序
          // 但为了即时反馈，我们手动更新 dialogs
          const updatedDialogs = dialogs.map((d) =>
            d.id === dialog.id ? { ...d, isPinned: !d.isPinned } : d
          );
          
          updatedDialogs.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.updatedAt - a.updatedAt;
          });
          
          setDialogs(updatedDialogs);
        }
      } catch (error) {
        console.error('Failed to toggle pin:', error);
      }
    }, 0);
  };

  const handleDeleteDialog = (e: React.MouseEvent, dialogId: string) => {
    e.stopPropagation();
    setDialogToDelete(dialogId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!dialogToDelete) return;
    try {
      const result = await window.ipcRenderer.dialog.delete(dialogToDelete);
      if (result.success) {
        removeDialog(dialogToDelete);

        // 如果删除的是当前选中的对话，则创建新对话并跳转
        if (currentDialogId === dialogToDelete) {
          try {
            // 切换回默认模式
            setChatMode('default');
            const newDialog = await window.ipcRenderer.dialog.create({
              title: '新对话',
              type: 'single',
            });
            if (newDialog?.success && newDialog.data) {
              setCurrentDialog(newDialog.data.id);
              navigate(`/chat/${newDialog.data.id}`);
            } else {
              navigate('/chat');
            }
          } catch (error) {
            console.error('创建新对话失败:', error);
            navigate('/chat');
          }
        }
        toast({ title: '对话已删除' });
      }
    } catch (error) {
      toast({ title: '删除失败', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setDialogToDelete(null);
    }
  };

  const handleBatchDelete = () => {
    if (selectedDialogIds.size === 0) return;
    setBatchDeleteDialogOpen(true);
  };

  const confirmBatchDelete = async () => {
    try {
      const ids = Array.from(selectedDialogIds);
      const result = await window.ipcRenderer.dialog.batchDelete(ids);
      
      if (result.success) {
        // 更新本地状态
        const newDialogs = Array.isArray(dialogs) ? dialogs.filter(d => !selectedDialogIds.has(d.id)) : [];
        setDialogs(newDialogs);
        
        // 如果当前选中的对话被删除了，需要处理
        if (currentDialogId && selectedDialogIds.has(currentDialogId)) {
          if (newDialogs.length > 0) {
            setCurrentDialog(newDialogs[0].id);
            // 切换回默认模式
            setChatMode('default');
            navigate(`/chat/${newDialogs[0].id}`);
          } else {
            // 创建新对话
            handleCreateDialog();
          }
        }
        
        setSelectedDialogIds(new Set());
        setIsBatchMode(false);
        toast({ title: `已删除 ${ids.length} 个对话` });
      }
    } catch (error) {
      console.error('Batch delete failed:', error);
      toast({ title: '批量删除失败', variant: 'destructive' });
    } finally {
      setBatchDeleteDialogOpen(false);
    }
  };

  const handleBatchPin = async (isPinned: boolean) => {
    if (selectedDialogIds.size === 0) return;
    
    try {
      const ids = Array.from(selectedDialogIds);
      const result = await window.ipcRenderer.dialog.batchUpdate(ids, { isPinned });
      
      if (result.success) {
        // 更新本地状态
        const updatedDialogs = Array.isArray(dialogs) ? dialogs.map(d => 
          selectedDialogIds.has(d.id) ? { ...d, isPinned } : d
        ) : [];
        
        updatedDialogs.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.updatedAt - a.updatedAt;
        });
        
        setDialogs(updatedDialogs);
        setSelectedDialogIds(new Set());
        setIsBatchMode(false);
        toast({ title: isPinned ? '已批量置顶' : '已批量取消置顶' });
      }
    } catch (error) {
      console.error('Batch pin failed:', error);
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  return (
    <div className="flex h-screen bg-background flex-col">
      {/* 现代化标题栏 */}
      <WindowTitleBar />

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 移动端菜单遮罩 */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* 左侧边栏 */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 lg:relative lg:translate-x-0',
            sidebarCollapsed ? 'lg:w-16' : '',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* 新建对话按钮和批量操作 */}
          <div className="p-4 border-b flex gap-2">
            {!isBatchMode ? (
              <>
                <Button
                  className="flex-1"
                  onClick={handleCreateDialog}
                  disabled={isCreating}
                >
                  <Plus size={18} className="mr-2" />
                  {!sidebarCollapsed && (isCreating ? '创建中...' : '新建对话')}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title="批量管理"
                  onClick={() => setIsBatchMode(true)}
                >
                  <ListChecks size={18} />
                </Button>
              </>
            ) : (
              <div className="flex w-full gap-1">
                <Button
                  variant="destructive"
                  size="icon"
                  className="flex-1"
                  disabled={selectedDialogIds.size === 0}
                  onClick={handleBatchDelete}
                  title="删除选中"
                >
                  <Trash2 size={18} />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="flex-1"
                  disabled={selectedDialogIds.size === 0}
                  onClick={() => handleBatchPin(true)}
                  title="置顶选中"
                >
                  <Pin size={18} />
                </Button>
                 <Button
                  variant="secondary"
                  size="icon"
                  className="flex-1"
                  disabled={selectedDialogIds.size === 0}
                  onClick={() => handleBatchPin(false)}
                  title="取消置顶"
                >
                  <PinOff size={18} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsBatchMode(false);
                    setSelectedDialogIds(new Set());
                  }}
                  title="取消"
                >
                  <X size={18} />
                </Button>
              </div>
            )}
          </div>

          {/* 对话列表 */}
          <div className="flex-1 overflow-auto p-2">
            {!sidebarCollapsed && (
              <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                对话列表
              </div>
            )}
            <div className="space-y-1">
              {Array.isArray(dialogs) && dialogs.map((dialog) => (
                <div
                  key={dialog.id}
                  className={cn(
                    'group relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer',
                    currentDialogId === dialog.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  )}
                  onClick={() => handleSelectDialog(dialog.id)}
                >
                  {isBatchMode ? (
                    <div className={cn(
                      "flex items-center justify-center w-4 h-4 rounded border",
                      selectedDialogIds.has(dialog.id) 
                        ? "bg-primary border-primary text-white" 
                        : "border-muted-foreground"
                    )}>
                      {selectedDialogIds.has(dialog.id) && <Check size={12} strokeWidth={3} />}
                    </div>
                  ) : (
                    <MessageCircle size={16} />
                  )}
                  {!sidebarCollapsed && (
                    <>
                      <span className="truncate flex-1 text-left">
                        {dialog.title}
                      </span>
                      {dialog.isPinned && <Pin size={12} className="rotate-45" />}
                      
                      {!isBatchMode && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 hover:bg-transparent"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem onClick={(e) => handleTogglePin(e, dialog)}>
                                {dialog.isPinned ? (
                                  <>
                                    <PinOff className="mr-2 h-4 w-4" />
                                    <span>取消置顶</span>
                                  </>
                                ) : (
                                  <>
                                    <Pin className="mr-2 h-4 w-4" />
                                    <span>置顶</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={(e) => handleDeleteDialog(e, dialog.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>删除</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 底部导航 */}
          <div className="border-t p-2">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (item.path === '/chat') {
                        setChatMode('default');
                      }
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    )}
                  >
                    <item.icon size={18} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 折叠按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-1/2 hidden -translate-y-1/2 rounded-full border bg-background lg:flex"
            onClick={toggleSidebarCollapsed}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </Button>
        </aside>

        {/* 页面内容 */}
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
          <div className={cn(
            "absolute inset-0 bg-background transition-opacity duration-200", 
            location.pathname.startsWith('/flow') ? "z-0 opacity-100" : "z-0 opacity-0 pointer-events-none"
          )}>
            <FlowEditorPage />
          </div>
          <div className={cn(
            "absolute inset-0 bg-background transition-opacity duration-200", 
            // 只要是思维导图路由，或者是聊天路由且开启了思维导图模式，就显示
            // 注意 z-index: 如果是 MindmapMode，它应该在底层 (z-0)，让 Outlet (z-10) 浮在上面
            location.pathname.startsWith('/mindmap') ? "z-0 opacity-100" : "z-0 opacity-0 pointer-events-none"
          )}>
            <MindmapPage />
          </div>
        </main>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除这个对话吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除该对话及其所有历史记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除选中的 {selectedDialogIds.size} 个对话吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除这些对话及其所有历史记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBatchDelete} className="bg-red-600 hover:bg-red-700">
              批量删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

