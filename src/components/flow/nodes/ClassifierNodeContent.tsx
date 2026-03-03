import React from 'react';
import type { ThemeConfig } from '@/types/theme';
import { GitBranch, Minus, Plus, X, Scissors, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/helpers';
import { BaseNodeContainer } from './common/BaseNodeContainer';

interface ClassifierNodeContentProps {
  label: string;
  theme?: ThemeConfig;
  lastValue?: number | string;
  portCount: number;
  keywords?: string[];
  activeIndex?: number;
  trimKeyword?: boolean;
  onPortCountChange: (count: number) => void;
  onAddPort: () => void;
  onRemovePort: () => void;
  onKeywordChange: (index: number, keyword: string) => void;
  onTrimKeywordChange?: (trim: boolean) => void;
  onClear: () => void;
}

export function ClassifierNodeContent({ 
  label, 
  theme, 
  lastValue, 
  portCount, 
  keywords = [], 
  activeIndex,
  trimKeyword = true,
  onPortCountChange, 
  onAddPort, 
  onRemovePort, 
  onKeywordChange,
  onTrimKeywordChange,
  onClear
}: ClassifierNodeContentProps) {
  
  const headerActions = (
    <div className="flex items-center gap-1">
        {/* Trim toggle */}
        <Button
            variant={trimKeyword ? "default" : "ghost"}
            size="icon"
            className={cn(
                "h-5 w-5 rounded-sm", 
                trimKeyword ? "bg-primary/20 text-primary hover:bg-primary/30" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={(e) => { e.stopPropagation(); onTrimKeywordChange?.(!trimKeyword); }}
            title={trimKeyword ? "移除关键词: 开启" : "移除关键词: 关闭"}
            style={theme && trimKeyword ? { backgroundColor: `${theme.lineColor}33`, color: theme.lineColor } : undefined}
        >
            {trimKeyword ? <Scissors size={10} /> : <Type size={10} />}
        </Button>

        {activeIndex !== undefined && activeIndex !== -1 && (
            <Button 
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="h-5 w-5 rounded-full hover:bg-muted/20 text-muted-foreground hover:text-foreground"
                title="清除状态"
            >
                <X size={10} />
            </Button>
        )}
    </div>
  );

  return (
    <BaseNodeContainer
      label={label}
      icon={<GitBranch size={16} />}
      theme={theme}
      headerActions={headerActions}
      showStatus={false}
      width="w-auto"
      className="min-w-[140px]"
      contentClassName="p-2 pt-0 flex flex-col items-center gap-2"
    >
      {/* Port configuration controls - Stepper Style */}
      <div 
        className="flex items-center justify-between rounded-md border p-0.5 w-full max-w-[100px] bg-background/50"
        style={{ 
          borderColor: theme?.nodeBorderColor ? `${theme.nodeBorderColor}80` : undefined,
          backgroundColor: theme?.nodeBackgroundColor ? undefined : 'rgba(0,0,0,0.05)'
        }}
      >
        <Button 
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onRemovePort(); }}
          className="h-5 w-5 p-0 hover:bg-muted/20"
          disabled={portCount <= 1}
          title="减少端口"
        >
          <Minus size={12} />
        </Button>

        <span className="text-xs font-mono font-medium select-none min-w-[20px] text-center">
          {portCount}
        </span>
        
        <Button 
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onAddPort(); }}
          className="h-5 w-5 p-0 hover:bg-muted/20"
          disabled={portCount >= 10}
          title="增加端口"
        >
          <Plus size={12} />
        </Button>
      </div>

      {/* Keywords Inputs */}
      <div className="flex flex-col gap-1 w-full">
        {Array.from({ length: portCount }).map((_, index) => {
          const isActive = activeIndex === index;
          return (
            <div key={index} className="flex items-center gap-1 w-full h-[24px]">
               <span className="text-[10px] opacity-60 w-4 text-right select-none">{index + 1}</span>
               <input
                 type="text"
                 value={keywords[index] || ''}
                 placeholder={index === portCount - 1 ? "Default" : "Keyword..."}
                 onChange={(e) => onKeywordChange(index, e.target.value)}
                 className={`flex-1 min-w-0 px-1.5 py-0.5 text-[10px] border rounded bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors ${isActive ? 'bg-green-500/20 border-green-500/50' : ''}`}
                 style={{
                   borderColor: isActive 
                      ? '#22c55e' 
                      : (theme?.nodeBorderColor ? `${theme.nodeBorderColor}60` : undefined),
                   backgroundColor: isActive 
                      ? 'rgba(34, 197, 94, 0.2)' 
                      : undefined,
                   color: theme?.textColor
                 }}
                 onMouseDown={(e) => e.stopPropagation()} // Prevent drag
               />
            </div>
          );
        })}
      </div>
    </BaseNodeContainer>
  );
}
