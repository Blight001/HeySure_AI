import { useMemo } from 'react';
import { useToast } from './use-toast';

// 扩展 Toast 类型以支持 variant
export type ToastVariant = 'default' | 'destructive';
export type ExtendedToast = {
  variant?: ToastVariant;
  title?: string;
  description?: string;
  duration?: number;
};

// 包装 toast hook 以支持 variant
export function useExtendedToast() {
  const { toast } = useToast();
  return useMemo(() => ({
    toast: (t: ExtendedToast) => toast(t),
  }), [toast]);
}
