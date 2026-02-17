/**
 * HeySure AI - 最新值引用 Hook
 * 返回一个始终保持最新值的 ref，用于在回调函数中访问最新的值
 * 避免因闭包导致的陈旧值问题
 */
import { useRef, useEffect } from 'react';

export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
