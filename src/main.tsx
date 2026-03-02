/**
 * HeySure AI - 主入口文件
 * 负责初始化 React 应用并将其挂载到 DOM 中
 * 使用 React.StrictMode 启用严格模式检查
 * 使用 BrowserRouter 提供客户端路由功能
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);

