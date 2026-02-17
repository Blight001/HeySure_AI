/**
 * HeySure AI - 思维导图页面
 * 负责渲染思维导图编辑器组件
 * 设置页面标题为"思维导图 - HeySure AI"
 */
import { useEffect } from 'react';
import Mindmap from '@/components/mindmap';
import '@/components/mindmap/styles/mindmap.css';

export default function MindmapPage() {
  useEffect(() => {
    document.title = '思维导图 - HeySure AI';
  }, []);

  return <Mindmap />;
}

