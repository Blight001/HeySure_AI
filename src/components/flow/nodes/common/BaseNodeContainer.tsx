
import React, { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/helpers';
import type { ThemeConfig } from '@/types/theme';
import { NodeStatusBadge } from './NodeStatusBadge';

export interface BaseNodeContainerProps {
  label: ReactNode;
  title?: string;
  icon?: ReactNode;
  theme?: ThemeConfig;
  status?: string;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  width?: string | number;
  isExpanded?: boolean;
  expandedWidth?: string | number;
  collapsedWidth?: string | number;
  headerClassName?: string;
  // 是否显示状态Badge
  showStatus?: boolean;
  statusLabels?: Record<string, string>;
  statusColors?: Record<string, string>;
}

export function BaseNodeContainer({
  label,
  title,
  icon,
  theme,
  status,
  headerActions,
  footer,
  children,
  className,
  contentClassName,
  width = "w-64", // 默认宽度
  isExpanded = false,
  expandedWidth = "w-96",
  collapsedWidth = "w-80",
  headerClassName,
  showStatus = true,
  statusLabels,
  statusColors,
}: BaseNodeContainerProps) {
  
  // 计算最终宽度类名或样式
  const finalWidth = isExpanded 
    ? (typeof expandedWidth === 'number' ? `w-[${expandedWidth}px]` : expandedWidth)
    : (typeof width === 'string' && width.startsWith('w-') ? width : `w-[${width}px]`);

  // 确定 title 属性，如果 label 是字符串则作为默认 title，否则使用传入的 title
  const tooltipTitle = title || (typeof label === 'string' ? label : undefined);

  return (
    <Card 
      className={cn(
        "border-0 shadow-none bg-transparent transition-all duration-300",
        finalWidth,
        className
      )}
    >
      <CardHeader 
        className={cn(
          "p-3 pb-2 flex flex-row items-center justify-between space-y-0",
          headerClassName
        )}
      >
        <CardTitle 
          className="text-sm font-medium flex items-center gap-2 truncate" 
          style={{ color: theme?.textColor }}
          title={tooltipTitle}
        >
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className="truncate">{label}</span>
        </CardTitle>
        
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {headerActions}
          {showStatus && status && (
            <NodeStatusBadge 
              status={status} 
              labels={statusLabels} 
              colors={statusColors} 
            />
          )}
        </div>
      </CardHeader>
      
      <CardContent className={cn("p-3 pt-0 space-y-2", contentClassName)}>
        {children}
        {footer && <div className="mt-2 pt-2 border-t border-border/10">{footer}</div>}
      </CardContent>
    </Card>
  );
}
