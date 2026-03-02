/**
 * HeySure AI - 应用主组件
 * 负责应用程序路由配置和主题初始化
 * 包含错误边界保护，监听系统主题变化
 */
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import MainLayout from '@/components/layout/MainLayout';
import HomePage from '@/pages/Home';
import PluginsPage from '@/pages/Plugins';
import SettingsPage from '@/pages/Settings';
import NotificationsPage from '@/pages/Notifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSettingsStore } from '@/stores';
import { applyTheme } from '@/utils/helpers';

function App() {
  const { theme } = useSettingsStore();

  useEffect(() => {
    // 初始化主题
    applyTheme(theme);

    // 监听系统主题变化（仅当设置为跟随系统时）
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<HomePage />} />
          <Route path="chat/:dialogId" element={<HomePage />} />
          <Route path="flow" element={null} />
          <Route path="flow/:flowId" element={null} />
          <Route path="mindmap" element={null} />
          <Route path="plugins" element={<PluginsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;

