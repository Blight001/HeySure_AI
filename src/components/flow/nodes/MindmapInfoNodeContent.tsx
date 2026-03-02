
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Layout, GitCommit, FileJson, AlignLeft, Folder } from 'lucide-react';
import type { NodeData } from '@/types/flow';
import type { ThemeConfig } from '@/types/theme';

interface MindmapInfoNodeContentProps {
  data?: NodeData;
  theme?: ThemeConfig;
  onUpdate?: (data: Partial<NodeData>) => void;
}

const infoTypes = [
  { value: 'markdown', label: '完整导图(Markdown)', icon: FileText },
  { value: 'structure', label: '仅导图结构', icon: Layout },
  { value: 'summary', label: '导图摘要(一级节点)', icon: AlignLeft },
  { value: 'root', label: '仅中心主题', icon: GitCommit },
  { value: 'json', label: '完整导图(JSON)', icon: FileJson },
  { value: 'fileList', label: '导图文件列表', icon: Folder },
];

export function MindmapInfoNodeContent({ data, theme, onUpdate }: MindmapInfoNodeContentProps) {
  const status = data?.status;
  const lastUpdate = data?.lastUpdate;
  const infoType = data?.infoType || 'markdown';

  const handleTypeChange = (value: string) => {
    onUpdate?.({ infoType: value });
  };

  return (
    <Card className="w-64 border-0 shadow-none bg-transparent">
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: theme?.textColor }}>
          <FileText className="w-4 h-4" />
          {data?.label || '思维导图信息'}
        </CardTitle>
        {status === 'running' && (
          <Badge variant="outline" className="animate-pulse bg-blue-500/10 text-blue-500 border-blue-500/20">
            获取中...
          </Badge>
        )}
        {status === 'completed' && (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            已获取
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <div className="nodrag">
          <Select value={infoType} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-8 text-xs bg-background/50 border-input/50">
              <SelectValue placeholder="选择获取内容" />
            </SelectTrigger>
            <SelectContent>
              {infoTypes.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    <type.icon className="w-3 h-3" />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground truncate" style={{ color: theme?.textColor ? `${theme.textColor}99` : undefined }}>
          {lastUpdate ? `更新于: ${lastUpdate}` : '等待触发...'}
        </div>
        {data?.mapName && (
           <div className="text-xs mt-1 font-medium truncate" style={{ color: theme?.textColor }}>
             当前导图: {data.mapName}
           </div>
        )}
      </CardContent>
    </Card>
  );
}
