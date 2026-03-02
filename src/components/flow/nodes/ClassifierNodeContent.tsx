import type { ThemeConfig } from '@/types/theme';
import { GitBranch, Minus, Plus, X } from 'lucide-react';

interface ClassifierNodeContentProps {
  label: string;
  theme?: ThemeConfig;
  lastValue?: number | string;
  portCount: number;
  keywords?: string[];
  activeIndex?: number;
  onPortCountChange: (count: number) => void;
  onAddPort: () => void;
  onRemovePort: () => void;
  onKeywordChange: (index: number, keyword: string) => void;
  onClear: () => void;
}

export function ClassifierNodeContent({ 
  label, 
  theme, 
  lastValue, 
  portCount, 
  keywords = [], 
  activeIndex,
  onPortCountChange, 
  onAddPort, 
  onRemovePort,
  onKeywordChange,
  onClear
}: ClassifierNodeContentProps) {
  return (
    <div className="flex flex-col items-center gap-2 mb-1 p-2 min-w-[140px]" 
         style={{ 
           color: theme?.textColor,
           minHeight: `${40 + portCount * 30}px` 
         }}>
      <div className="flex items-center gap-2 w-full justify-center relative">
        <GitBranch size={16} />
        <span className="font-medium text-sm truncate">{label}</span>
        {activeIndex !== undefined && activeIndex !== -1 && (
            <button 
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="absolute -right-1 top-0.5 p-0.5 rounded-full hover:bg-muted/20 opacity-60 hover:opacity-100 transition-opacity"
                title="清除状态"
                style={{ color: theme?.textColor }}
            >
                <X size={10} />
            </button>
        )}
      </div>
      
      {/* Port configuration controls - Stepper Style */}
      <div 
        className="flex items-center justify-between rounded-md border p-0.5 w-full max-w-[100px] bg-background/50 mb-2"
        style={{ 
          borderColor: theme?.nodeBorderColor ? `${theme.nodeBorderColor}80` : undefined, // 50% opacity
          backgroundColor: theme?.nodeBackgroundColor ? undefined : 'rgba(0,0,0,0.05)'
        }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onRemovePort(); }}
          className="p-1 hover:bg-muted/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          disabled={portCount <= 1}
          title="减少端口"
          style={{ color: theme?.textColor }}
        >
          <Minus size={12} />
        </button>

        <span className="text-xs font-mono font-medium select-none min-w-[20px] text-center">
          {portCount}
        </span>

        <button 
          onClick={(e) => { e.stopPropagation(); onAddPort(); }}
          className="p-1 hover:bg-muted/20 rounded transition-colors flex items-center justify-center"
          title="增加端口"
          style={{ color: theme?.textColor }}
        >
          <Plus size={12} />
        </button>
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
    </div>
  );
}
