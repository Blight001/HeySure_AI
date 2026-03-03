# 操作流程组件手册 (Workflow Runner)

**Workflow Runner** 节点允许您在当前工作流中调用、执行和控制其他子流程。

## 1. 组件介绍

*   **图标**: ⚙️ (Gear)
*   **功能**: 后台运行子流程、并发控制、实时进度显示。
*   **输入**: 支持简单文本（流程名）、JSON 对象。

## 2. 输入协议

### 2.1 统一 JSON 协议 (推荐)

这是与系统内 AI 智能体一致的标准格式。

```json
{
  "type": "workflow",
  "command": "start | stop | pause | list",
  "flowName": "目标流程",
  "input": "初始数据",
  "outputMode": "default | all_text"
}
```

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `type` | String | 固定为 `"workflow"` 或 `"controlExecution"` |
| `command` | String | `"start"` (启动) / `"stop"` (停止) / `"pause"` (暂停) / `"list"` (列表) |
| `flowName` | String | 目标流程名称 |
| `input` | Any | (可选) 传递给子流程的数据 |
| `outputMode`| String | (可选) `"default"` (仅End节点) / `"all_text"` (所有文本汇总) |

### 2.2 简单文本模式

直接发送**流程名称**字符串，即视为启动该流程。
*   **示例**: `"数据处理流程"` -> 启动名为“数据处理流程”的实例。

## 3. 输出数据

| 模式 | 数据类型 | 说明 |
| :--- | :--- | :--- |
| `default` | Any | 子流程 **End 节点**接收到的数据 |
| `all_text` | String[] | 子流程中所有**文本/对话节点**的内容列表 |
| `list` | Object[] | 流程列表数据 (包含 id, name 等) |

## 4. 场景示例

**启动并传参**
```json
{
  "type": "workflow",
  "command": "start",
  "flowName": "网页抓取",
  "input": "https://example.com"
}
```

**紧急停止**
```json
{ "type": "workflow", "command": "stop", "flowName": "批量任务" }
```

**获取流程列表**
```json
{ "type": "workflow", "command": "list" }
```

## 5. 协议区分

*   **本组件 (运行)**: 使用 `type: "workflow"`，用于**执行**流程。
*   **AI 修改 (编辑)**: 使用 `target: "flow", op: "..."`，用于**修改**流程结构。

---
*HeySure AI Team*
