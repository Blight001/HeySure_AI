# AI 对话组件手册 (AI Chat)

**AI Chat** 节点是流程中的核心智能单元，支持大模型对话、上下文记忆及动态配置。

## 1. 组件介绍

*   **图标**: 🤖 (Bot)
*   **功能**: 与 LLM 进行多轮对话、动态调整系统提示词、管理上下文记忆。
*   **输入**: 支持普通文本（对话内容）、JSON 配置指令。

## 2. 输入协议

### 2.1 动态配置协议 (JSON)

通过发送特定格式的 JSON 对象，可以在运行时动态修改 AI 节点的配置，而不会触发 AI 对话。

```json
{
  "type": "config",
  "systemPrompt": "新的系统提示词...",
  "useMemory": true,
  "modelId": "gpt-4",
  "clearHistory": true
}
```

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `type` | String | **必须**。固定为 `"config"`，标识为配置指令 |
| `systemPrompt` | String | (可选) 更新当前节点的系统提示词 (System Prompt) |
| `useMemory` | Boolean | (可选) `true` 开启历史记忆，`false` 仅单次对话 |
| `modelId` | String | (可选) 切换使用的模型 ID (需确保模型已配置) |
| `clearHistory`| Boolean | (可选) `true` 清空当前节点的历史对话记录 |

### 2.2 普通对话模式

直接发送**文本字符串**或**非配置类 JSON**，将作为用户消息发送给 AI 进行对话。

*   **示例**: `"帮我写一段代码"` -> AI 接收并回复。

## 3. 输出数据

*   **配置模式**: 返回配置成功提示信息 (如 `"Configuration updated"`, `"History cleared"`)。
*   **对话模式**: 返回 AI 的回复内容 (String)。

## 4. 场景示例

**动态切换角色**
```json
{
  "type": "config",
  "systemPrompt": "你现在是一个 Python 专家，只回答代码相关问题。"
}
```

**开启新话题 (清空记忆)**
```json
{
  "type": "config",
  "clearHistory": true,
  "useMemory": true
}
```

**临时切换模型**
```json
{
  "type": "config",
  "modelId": "claude-3-opus"
}
```

## 5. 注意事项

*   **配置指令不消耗 Token**: 配置指令仅在本地更新节点状态，不会发送给 LLM 服务商。
*   **实时生效**: 配置更新后立即生效，后续的对话将使用新的配置。
*   **持久化**: 更新的配置（如 System Prompt）会保存在节点数据中，随流程保存。

---
*HeySure AI Team*
