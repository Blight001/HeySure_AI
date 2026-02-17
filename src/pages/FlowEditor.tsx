/**
 * HeySure AI - 流程编辑器页面
 * 负责渲染流程编排编辑器组件
 * 设置页面标题为"流程编排 - HeySure AI"
 */
import { useEffect } from 'react';
import { FlowEditor } from '@/components/flow';

export default function FlowEditorPage() {
  useEffect(() => {
    document.title = '流程编排 - HeySure AI';
  }, []);

  return <FlowEditor />;
}
