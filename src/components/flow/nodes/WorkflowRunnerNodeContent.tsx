
import React, { memo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Activity, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/helpers';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ThemeConfig } from '@/types/theme';
import { BaseNodeContainer } from './common/BaseNodeContainer';
import { NodeStatusBadge } from './common/NodeStatusBadge';

export interface RunnerInstance {
    id: string;
    workflowName: string;
    status: 'running' | 'completed' | 'error' | 'paused' | 'idle';
    progress: { total: number; completed: number; running: number };
    startTime: number;
    result?: any;
    runningNodes?: string[];
}

interface WorkflowRunnerNodeContentProps {
    data: {
        label?: string;
        instances?: RunnerInstance[];
        [key: string]: any;
    };
    id: string;
    theme?: ThemeConfig;
    onControl?: (instanceId: string, command: 'pause' | 'resume' | 'stop') => void;
}

const WorkflowRunnerNodeContent = memo(({ data, id, theme, onControl }: WorkflowRunnerNodeContentProps) => {
    const instances: RunnerInstance[] = data.instances || [];
    const [isExpanded, setIsExpanded] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);

    const filteredInstances = hideCompleted 
        ? instances.filter(i => i.status !== 'completed') 
        : instances;

    // 计算实际需要的高度
    // 基础高度 80px (header + padding)
    // 每个项目约 70px (根据实际渲染高度估算)
    // 最大高度限制 500px
    const getItemHeight = (instance: RunnerInstance) => {
        let h = 56; // 基础卡片高度
        if (instance.runningNodes && instance.runningNodes.length > 0) h += 16; // 额外行
        return h;
    };

    const contentHeight = filteredInstances.reduce((acc, inst) => acc + getItemHeight(inst) + 12, 0); // 12 is gap
    const autoHeight = Math.min(Math.max(contentHeight, 128), 500); // 最小 128 (32 * 4), 最大 500

    const runningCount = instances.filter(i => i.status === 'running').length;

    const headerActions = (
        <div className="flex items-center gap-1">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                    e.stopPropagation();
                    setHideCompleted(!hideCompleted);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title={hideCompleted ? "显示已完成" : "隐藏已完成"}
            >
                {hideCompleted ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title={isExpanded ? "收起" : "展开全部"}
            >
                {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
            <Badge variant="outline" className="text-xs ml-1">
                {runningCount} 运行中
            </Badge>
        </div>
    );

    return (
        <BaseNodeContainer
            label={data.label || '操作流程执行器'}
            icon={<Activity className="h-4 w-4" />}
            theme={theme}
            headerActions={headerActions}
            isExpanded={isExpanded}
            width="w-80"
            expandedWidth="w-96"
            collapsedWidth="w-80"
            showStatus={false} // 我们在这里自定义了状态显示（Badge），所以不使用默认的状态 Badge
        >
            <ScrollArea 
                className={cn(
                    "w-full rounded-md border p-2 bg-muted/20 transition-all duration-300"
                )}
                style={{
                    height: isExpanded ? `${autoHeight}px` : '128px'
                }}
            >
                {filteredInstances.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-8">
                        {hideCompleted && instances.length > 0 ? "已隐藏完成任务" : "等待输入启动流程..."}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredInstances.map((instance) => (
                            <div key={instance.id} className="space-y-1 bg-background p-2 rounded border shadow-sm">
                                <div className="flex justify-between items-center text-xs">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium truncate max-w-[100px]" title={instance.workflowName}>
                                            {instance.workflowName}
                                        </span>
                                        {instance.runningNodes && instance.runningNodes.length > 0 && (
                                            <div className="text-[10px] text-primary truncate max-w-[100px]" title={instance.runningNodes.join(', ')}>
                                                执行: {instance.runningNodes.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {instance.status === 'running' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 p-0"
                                                title="暂停"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onControl?.(instance.id, 'pause');
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                <Pause className="h-3 w-3" />
                                            </Button>
                                        )}
                                        {instance.status === 'paused' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 p-0"
                                                title="继续"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onControl?.(instance.id, 'resume');
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                <Play className="h-3 w-3" />
                                            </Button>
                                        )}
                                        {(instance.status === 'running' || instance.status === 'paused') && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 p-0 hover:text-destructive"
                                                title="停止"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onControl?.(instance.id, 'stop');
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                <Square className="h-3 w-3" />
                                            </Button>
                                        )}
                                        <NodeStatusBadge status={instance.status} />
                                    </div>
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                                    <span>{new Date(instance.startTime).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </BaseNodeContainer>
    );
});

WorkflowRunnerNodeContent.displayName = 'WorkflowRunnerNodeContent';

export default WorkflowRunnerNodeContent;
