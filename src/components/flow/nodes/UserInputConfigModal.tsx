/**
 * HeySure AI - 用户输入节点配置弹窗组件
 * 配置用户输入节点的输入格式：
 * - 输入格式选择（纯文本/JSON）
 * - JSON 模板编辑
 * - 配置保存和取消操作
 */
import { useState, useEffect } from 'react';
import { X, Save, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export interface UserInputConfig {
  formatType: 'text' | 'json';
  jsonTemplate?: string;
}

interface UserInputConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: UserInputConfig) => void;
  initialConfig?: UserInputConfig;
}

const DEFAULT_JSON_TEMPLATE = `{
  "role": "user",
  "content": "{{input}}"
}`;

export function UserInputConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig
}: UserInputConfigModalProps) {
  const [formatType, setFormatType] = useState<'text' | 'json'>('text');
  const [jsonTemplate, setJsonTemplate] = useState(DEFAULT_JSON_TEMPLATE);

  useEffect(() => {
    if (isOpen) {
      setFormatType(initialConfig?.formatType || 'text');
      setJsonTemplate(initialConfig?.jsonTemplate || DEFAULT_JSON_TEMPLATE);
    }
  }, [isOpen, initialConfig]);

  const handleSave = () => {
    onSave({
      formatType,
      jsonTemplate: formatType === 'json' ? jsonTemplate : undefined
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>用户输入配置</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="format-type">通信格式</Label>
            <Select 
              value={formatType} 
              onValueChange={(value: 'text' | 'json') => setFormatType(value)}
            >
              <SelectTrigger id="format-type">
                <SelectValue placeholder="选择格式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">纯文本 (Text)</SelectItem>
                <SelectItem value="json">JSON 对象</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formatType === 'json' && (
            <div className="grid gap-2">
              <Label htmlFor="json-template">
                JSON 模板
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  使用 {"{{input}}"} 代表用户输入的内容
                </span>
              </Label>
              <Textarea
                id="json-template"
                value={jsonTemplate}
                onChange={(e) => setJsonTemplate(e.target.value)}
                className="font-mono text-xs min-h-[150px]"
                placeholder={DEFAULT_JSON_TEMPLATE}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>
            <Save size={14} className="mr-2" />
            保存配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
