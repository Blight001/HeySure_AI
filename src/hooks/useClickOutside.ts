/**
 * HeySure AI - 点击外部检测 Hook
 * 监听元素外部的点击事件，当点击发生在 ref 元素外部时触发回调
 * 常用于下拉菜单、弹窗等需要点击外部关闭的场景
 */
import { useEffect, useRef } from 'react';

/**
 * Hook that alerts clicks outside of the passed ref
 */
export function useClickOutside<T extends HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler]);

  return ref;
}
