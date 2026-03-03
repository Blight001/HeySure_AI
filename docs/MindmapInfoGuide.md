# 思维导图信息组件手册 (Mindmap Info)

**Mindmap Info** 节点用于获取思维导图的结构、内容及特定节点信息。

## 1. 组件介绍

*   **图标**: 📝 (FileText)
*   **功能**: 获取导图结构 (Markdown/JSON)、查询节点信息、列出导图文件。
*   **输入**: 支持属性预设、文本指令、JSON 对象。

## 2. 输入协议

### 2.1 统一 JSON 协议 (推荐)

这是与系统内 AI 智能体一致的标准格式。

```json
{
  "type": "mindmap",
  "command": "get | list",
  "mapName": "目标导图",
  "nodeName": "目标节点",
  "depth": 1
}
```

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `type` | String | 固定为 `"mindmap"` 或 `"mindmapInfo"` |
| `command` | String | `"get"` (获取信息，默认) / `"list"` (文件列表) |
| `mapName` | String | (可选) 目标导图名称 |
| `nodeName`| String | (可选) 目标节点名称 |
| `depth` | Number | (可选) 查询深度，默认 1 |

### 2.2 文本快捷指令

| 指令格式 | 示例 | 说明 |
| :--- | :--- | :--- |
| `list` / `files` | `list` | 获取所有导图文件列表 |
| `node:<名称>` | `node:后端` | 获取指定节点信息 (可简写为节点名) |
| `map:<名称>` | `map:需求` | 指定查询的导图文件 |
| `depth:<层级>` | `depth:2` | 指定查询深度 |

### 2.3 属性预设

当输入为空时，根据属性面板的 **“获取信息类型”** 输出：
*   **完整结构**: Markdown 或 JSON 格式。
*   **摘要/中心主题**: 仅获取概览信息。
*   **文件列表**: 列出所有导图。

## 3. 场景示例

**获取导图列表**
```json
{ "type": "mindmap", "command": "list" }
```

**查询特定节点 (深度2)**
```json
{
  "type": "mindmap",
  "command": "get",
  "mapName": "需求分析",
  "nodeName": "用户模块",
  "depth": 2
}
```

## 4. 协议区分

*   **本组件 (查询)**: 使用 `type: "mindmap"`，仅用于**读取**信息。
*   **AI 修改 (编辑)**: 使用 `target: "mindmap", op: "add/rename/..."`，用于**修改**导图结构。

---
*HeySure AI Team*
