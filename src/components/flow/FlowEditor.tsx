/**
 * HeySure AI - 流程编辑器主组件
 * 负责流程编排的完整渲染，包括：
 * - 流程头部（标题、保存状态、模型选择等）
 * - 画布工具栏（撤销/重做、缩放、动画速度等）
 * - 流程画布（节点渲染、连线渲染、拖拽、框选等）
 * - 节点面板（AI节点、Python节点、逻辑节点等）
 * - Python脚本管理器
 * - AI对话浮窗
 * - 快捷键帮助面板
 */
import { PythonNodeConfigModal } from './python/node/PythonNodeConfigModal';
import { PythonScriptManager } from './python/manager/PythonScriptManager';
import {
  CanvasToolbar,
  CanvasGrid,
  ShortcutHelp,
  PendingChangesPanel,
} from './canvas';
import { ModelConfigModal } from '@/components/model/ModelConfigModal';
import { FlowFloatingChat } from './chat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFlowController } from './hooks/useFlowController';
import { FlowHeader } from './header/FlowHeader';
import { FlowCanvasEdges } from './canvas/FlowCanvasEdges';
import { FlowCanvasNodes } from './canvas/FlowCanvasNodes';

export function FlowEditor() {
  const {
    canvasRef,
    headerProps,
    toolbarProps,
    canvasProps,
    pendingChangesProps,
    floatingChatProps,
    shortcutHelpProps,
    modals,
    saveStatus
  } = useFlowController();

  return (
    <div className="flex h-full flex-col">
      <FlowHeader {...headerProps} />

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none transition-colors duration-300"
          style={{ backgroundColor: canvasProps.currentTheme.backgroundColor }}
          onDragOver={canvasProps.onDragOver}
          onDrop={canvasProps.onDrop}
          onDragEnd={canvasProps.onDragEnd}
          onMouseMove={canvasProps.onMouseMove}
          onMouseUp={canvasProps.onMouseUp}
          onMouseLeave={canvasProps.onMouseLeave}
          onMouseDown={canvasProps.onMouseDown}
          onDoubleClickCapture={canvasProps.onDoubleClickCapture}
        >
          <CanvasToolbar
            canUndo={toolbarProps.canUndo}
            canRedo={toolbarProps.canRedo}
            zoom={toolbarProps.zoom}
            animationSpeed={toolbarProps.animationSpeed}
            connectionStrokeWidth={toolbarProps.connectionStrokeWidth}
            onUndo={toolbarProps.onUndo}
            onRedo={toolbarProps.onRedo}
            onZoomIn={toolbarProps.onZoomIn}
            onZoomOut={toolbarProps.onZoomOut}
            onResetView={toolbarProps.onResetView}
            onOpenChat={toolbarProps.onOpenChat}
            onSpeedChange={toolbarProps.onSpeedChange}
            onConnectionStrokeWidthChange={toolbarProps.onConnectionStrokeWidthChange}
            
            models={toolbarProps.models}
            scripts={toolbarProps.scripts}
            scriptComponents={toolbarProps.scriptComponents}
            isRefreshing={toolbarProps.isRefreshing}
            onRefreshScripts={toolbarProps.onRefreshScripts}
            onAddScript={toolbarProps.onAddScript}
            onOpenScriptManager={toolbarProps.onOpenScriptManager}
            onEditScript={toolbarProps.onEditScript}
            onDeleteScript={toolbarProps.onDeleteScript}
            onDeleteComponent={toolbarProps.onDeleteComponent}
            onModelConfig={toolbarProps.onModelConfig}
            onAddModelNode={toolbarProps.onAddModelNode}
            onAddPythonNode={toolbarProps.onAddPythonNode}
            onDragStart={toolbarProps.onDragStart}
            theme={toolbarProps.theme}
          />

          <PendingChangesPanel {...pendingChangesProps} />

          {/* 框选区域 */}
          {canvasProps.isSelecting && canvasProps.selectionBox && canvasRef.current && (
            <div
              className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-50"
              style={{
                left: Math.min(canvasProps.selectionBox.startX, canvasProps.selectionBox.currentX) - canvasRef.current.getBoundingClientRect().left,
                top: Math.min(canvasProps.selectionBox.startY, canvasProps.selectionBox.currentY) - canvasRef.current.getBoundingClientRect().top,
                width: Math.abs(canvasProps.selectionBox.currentX - canvasProps.selectionBox.startX),
                height: Math.abs(canvasProps.selectionBox.currentY - canvasProps.selectionBox.startY),
              }}
            />
          )}

          <div
            className="absolute inset-0 origin-top-left will-change-transform"
            style={{
              transform: `translate(${canvasProps.pan.x}px, ${canvasProps.pan.y}px) scale(${canvasProps.zoom})`,
            }}
          >
            <CanvasGrid showGrid={canvasProps.showGrid} color={canvasProps.currentTheme.gridColor} />
            
            <FlowCanvasEdges
              nodes={canvasProps.displayNodes}
              edges={canvasProps.displayEdges}
              nodeSizes={canvasProps.nodeSizes}
              animatingEdges={canvasProps.animatingEdges}
              pendingChangeState={canvasProps.pendingChangeState}
              connectionStrokeWidth={canvasProps.connectionStrokeWidth}
              animationSpeed={canvasProps.animationSpeed}
              onEdgeClick={canvasProps.onEdgeClick}
              connectionState={canvasProps.connectionState}
              defaultColor={canvasProps.currentTheme.connectionColor}
            />

            <FlowCanvasNodes
              nodes={canvasProps.displayNodes}
              selectedNodeIds={canvasProps.selectedNodeIds}
              connectionState={canvasProps.connectionState}
              pendingChangeState={canvasProps.pendingChangeState}
              models={canvasProps.models}
              theme={canvasProps.currentTheme}
              onSelect={canvasProps.onNodeSelect}
              onDelete={canvasProps.onNodeDelete}
              onStartConnection={canvasProps.onStartConnection}
              onCompleteConnection={canvasProps.onCompleteConnection}
              onSave={canvasProps.onNodeSave}
              onUpdate={canvasProps.onNodeUpdate}
              onDragStart={canvasProps.onNodeDragStart}
              onResize={canvasProps.onNodeResize}
              
              onTogglePythonMode={canvasProps.onTogglePythonMode}
              onToggleMemory={canvasProps.onToggleMemory}
              onClearHistory={canvasProps.onClearHistory}
              onUserInputSend={canvasProps.onUserInputSend}
              onSwitchSend={canvasProps.onSwitchSend}
              onTrigger={canvasProps.onTrigger}
              onSimpleTrigger={canvasProps.onSimpleTrigger}
            />
          </div>

          {saveStatus && (
            <div className="absolute top-4 right-4 z-50 pointer-events-none select-none animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="text-xs text-muted-foreground font-medium">
                {saveStatus}
              </div>
            </div>
          )}

          <ShortcutHelp 
            nodeCount={shortcutHelpProps.nodeCount} 
            edgeCount={shortcutHelpProps.edgeCount} 
            connectionVisible={shortcutHelpProps.connectionVisible} 
            theme={shortcutHelpProps.theme}
          />
        </div>
      </div>

      <PythonNodeConfigModal 
        isOpen={modals.configModalOpen} 
        onClose={() => modals.setConfigModalOpen(false)} 
        onSave={modals.handleScriptSaved} 
        editConfig={modals.editingConfig} 
      />
      <PythonScriptManager 
        isOpen={modals.managerOpen} 
        onClose={() => modals.setManagerOpen(false)} 
        onUpdate={toolbarProps.onRefreshScripts} 
      />

      <AlertDialog open={!!modals.edgeToDelete} onOpenChange={(open) => { if (!open) modals.setEdgeToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除连线</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，确定要删除这条连线吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (modals.edgeToDelete) {
                  modals.handleDeleteEdge(modals.edgeToDelete.id);
                  modals.setEdgeToDelete(null);
                }
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <ModelConfigModal 
        isOpen={modals.modelConfigOpen} 
        onClose={() => modals.setModelConfigOpen(false)} 
        onSave={modals.handleSaveModel} 
        modelConfig={modals.selectedModel} 
      />
      
      {floatingChatProps.shouldShow && (
        <FlowFloatingChat
          isOpen={floatingChatProps.isOpen}
          model={floatingChatProps.model}
          position={floatingChatProps.position}
          onClose={floatingChatProps.onClose}
          initialMessages={floatingChatProps.initialMessages}
          flowAppendixMd={floatingChatProps.flowAppendixMd}
          flowStructureMd={floatingChatProps.flowStructureMd}
          editInstructionsMd={floatingChatProps.editInstructionsMd}
          currentFlowId={floatingChatProps.currentFlowId}
          onUpdateMessages={floatingChatProps.onUpdateMessages}
          onResponse={floatingChatProps.onResponse}
        />
      )}
    </div>
  );
}
