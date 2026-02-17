import { useState } from 'react';
import { MindmapNode } from '../types';

export const useClipboard = () => {
  const [clipboardData, setClipboardData] = useState<{ node: MindmapNode; children: MindmapNode[] } | null>(null);
  const [isCut, setIsCut] = useState(false);

  return { clipboardData, setClipboardData, isCut, setIsCut };
};
