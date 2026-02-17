# HeySure AI 🎯

智能多AI对话协作平台 - 可视化流程编排系统

## 📋 简介

HeySure AI 是一款强大的智能对话协作桌面应用，基于 Electron + React + TypeScript 构建。核心功能包括多AI模型对话、可视化流程编排、思维导图和 Python 脚本自动化执行。

## ✨ 特性

- **🤖 多模型支持**: 支持 OpenAI 兼容 API 的各类大语言模型（千问、kimi、GLM 等）
- **💬 智能对话**: 流式输出、Markdown 渲染、代码高亮、多轮对话
- **🔀 流程编排**: 可视化流程编辑器，支持 20+ 种节点类型
- **🧠 思维导图**: 内置思维导图工具，支持 AI 辅助生成
- **🐍 Python 脚本**: 支持 Python 脚本导入执行，自动化任务
- **🔌 插件系统**: 灵活的 AI 模型配置和管理

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Electron + Electron Vite |
| 前端 | React 18 + TypeScript + Vite |
| 样式 | Tailwind CSS + Radix UI |
| 状态 | Zustand |
| 流程 | @xyflow/react |
| 思维导图 | simple-mind-map |
| AI | OpenAI SDK (兼容各类 API) |

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm (推荐)

### 安装

```bash
# 安装依赖
pnpm install

# 启动开发模式
pnpm dev

# 构建生产版本
pnpm build

# 打包 Windows 安装包
pnpm build:win
```

### 项目结构

```
HeySure_AI_1.0/
├── electron/              # Electron 主进程代码
│   ├── config/
│   │   └── paths.ts       # 路径配置
│   ├── ipc/               # IPC 通信处理
│   │   ├── aiIPC.ts       # AI 相关 IPC
│   │   ├── dialogIPC.ts   # 对话 IPC
│   │   ├── fileDialogIPC.ts
│   │   ├── flowIPC.ts     # 流程 IPC
│   │   ├── fsIPC.ts       # 文件系统 IPC
│   │   ├── messageIPC.ts  # 消息 IPC
│   │   ├── nodeIPC.ts     # 节点 IPC
│   │   ├── pluginIPC.ts   # 插件 IPC
│   │   ├── pythonIPC.ts   # Python IPC
│   │   ├── storeIPC.ts    # 存储 IPC
│   │   ├── windowIPC.ts   # 窗口 IPC
│   │   └── index.ts       # IPC 入口
│   ├── preload/
│   │   └── index.ts       # 预加载脚本
│   ├── services/
│   │   ├── AIService.ts        # AI 服务
│   │   ├── dialogStore.ts      # 对话存储
│   │   ├── flowService.ts      # 流程服务
│   │   └── pythonComponentService.ts
│   ├── window/
│   │   └── windowManager.ts
│   ├── main.ts            # 主进程入口
│   └── electron.vite.config.ts
│
├── src/                   # React 前端代码 (121 文件)
│   ├── components/
│   │   ├── chat/         # 聊天组件
│   │   │   ├── ChatInput.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── index.ts
│   │   ├── flow/         # 流程编排组件
│   │   │   ├── FlowEditor.tsx
│   │   │   ├── canvas/   # 画布组件 (11个)
│   │   │   ├── chat/     # 流程内嵌聊天
│   │   │   ├── core/     # 核心定义
│   │   │   ├── header/   # 头部组件
│   │   │   ├── hooks/    # 流程 Hooks (16个)
│   │   │   ├── nodes/    # 节点组件 (12个)
│   │   │   ├── python/   # Python 节点 (core/manager/node)
│   │   │   └── sidebar/  # 侧边栏组件 (7个)
│   │   ├── layout/       # 布局组件
│   │   │   ├── MainLayout.tsx
│   │   │   └── WindowTitleBar.tsx
│   │   ├── mindmap/      # 思维导图组件
│   │   │   ├── Mindmap.tsx
│   │   │   ├── chat/     # 导图内嵌聊天
│   │   │   ├── components/ (7个)
│   │   │   ├── hooks/    # 导图 Hooks (15个)
│   │   │   ├── services/ (4个)
│   │   │   ├── styles/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── model/        # 模型配置组件
│   │   ├── plugin/       # 插件组件
│   │   └── ui/           # 基础 UI 组件 (17个 Radix UI)
│   ├── pages/            # 页面 (6个)
│   │   ├── Home.tsx      # 聊天首页
│   │   ├── FlowEditor.tsx # 流程编辑
│   │   ├── Mindmap.tsx   # 思维导图
│   │   ├── Plugins.tsx   # 插件/模型配置
│   │   ├── Settings.tsx  # 设置
│   │   └── Notifications.tsx
│   ├── hooks/            # 通用 Hooks (5个)
│   ├── services/         # 前端服务
│   ├── stores/           # Zustand 状态管理 (5个)
│   ├── styles/           # 样式
│   ├── types/            # TypeScript 类型 (8个)
│   ├── utils/            # 工具函数
│   ├── App.tsx
│   └── main.tsx
│
├── python/                # Python 脚本
│   ├── BoxDisplay.py
│   ├── CH9329_HumanLikeController.py
│   ├── HumanLikeController.py
│   └── screen_capture.py
│
├── data/                  # 数据存储 (JSON文件)
│   ├── flows/            # 流程数据
│   │   └── categories.json
│   ├── messages.json     # 对话消息
│   ├── mindmap/          # 思维导图数据
│   │   └── mindmaps.json
│   ├── models.json       # AI 模型配置
│   ├── script/           # Python 脚本
│   │   ├── main.py
│   │   └── mode/
│   └── settings.json     # 应用设置
│
├── backup/               # 备份文件
├── public/image/         # 静态资源
├── dist-electron/        # 构建输出
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── electron.vite.config.ts
```

## 📖 功能说明

### AI 对话

- 支持多个 AI 模型同时配置
- 流式响应输出
- Markdown 渲染（代码高亮、数学公式）
- 对话历史保存

### 流程编排

支持节点类型：
- **触发器**: start, simpleTrigger, trigger, userInput
- **AI**: aiChat, llmJudge
- **逻辑**: condition, switch, parallel, aggregate, loop
- **数据**: variable, math, template, code, textDisplay
- **工具**: tool, python

### 思维导图

- 节点编辑与拖拽
- AI 辅助内容生成
- 自动布局
- 分类管理

### Python 脚本

- 脚本导入与管理
- 函数自动解析
- 流程节点集成
- 自动化执行

## 📝 配置

应用数据存储在 `data/` 目录（JSON 文件）：
- `settings.json` - 应用设置
- `models.json` - AI 模型配置
- `messages.json` - 对话历史
- `flows/` - 流程编排数据
- `mindmap/` - 思维导图数据
- `script/` - Python 脚本

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
