/**
 * HeySure AI - 工具函数集合
 * 提供常用的辅助函数：
 * - cn: 合并 className（clsx + tailwind-merge）
 * - formatDate/formatRelativeTime: 日期格式化
 * - generateId: 生成随机 ID
 * - truncate: 截断字符串
 * - debounce/throttle: 函数防抖和节流
 * - applyTheme/applyFontSize: 主题和字体大小应用
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: number | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: number | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return formatDate(date);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 应用主题到 DOM
export function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // 移除所有主题类
  root.classList.remove('light', 'dark');
  body.classList.remove('light', 'dark');

  if (theme === 'system') {
    // 系统偏好
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    const effectiveTheme = prefersDark ? 'dark' : 'light';
    root.classList.add(effectiveTheme);
    body.classList.add(effectiveTheme);
  } else {
    root.classList.add(theme);
    body.classList.add(theme);
  }
}

// 应用字体大小到 DOM
export function applyFontSize(fontSize: number) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--font-size', `${fontSize}px`);
  root.style.setProperty('font-size', `${fontSize}px`);
}

