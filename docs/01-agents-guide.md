# Mastra Agents（智能体）专题指南

## 1. 什么是 Agents？

Agents（智能体）是 Mastra 框架中的核心概念，是使用 LLM 和工具解决开放式任务的**自主实体**。

### 核心能力
- 🧠 **推理目标** - 根据用户输入理解和分析任务
- 🔧 **决定使用工具** - 自动选择合适的工具来完成任务
- 💾 **保留对话记忆** - 跨交互维护上下文
- 🔄 **内部迭代** - 持续迭代直到产生最终答案

---

## 2. Agents 的工作原理

```
1. 接收用户输入
        ↓
2. 解析 instructions（系统提示词）
        ↓
3. 推理目标，决定是否需要工具
        ↓
4. 调用工具获取信息（如果需要）
        ↓
5. 生成响应
        ↓
6. 返回结构化或文本响应
```

**核心组件**：每个智能体由 `instructions`（指令）、`model`（模型）和可选的 `tools`（工具）组成。

---

## 3. 相关核心概念

### 3.1 Instructions（指令）

Instructions 定义智能体的行为、个性和能力。它们是建立智能体核心身份和专业知识的系统级提示。

**支持的格式：**

```typescript
// 字符串格式（最常用）
instructions: "你是一个有帮助的助手。";

// 字符串数组
instructions: [
  "你是一个有帮助的助手。",
  "始终保持礼貌。",
  "提供详细的答案。",
];

// 系统消息数组
instructions: [
  { role: "system", content: "你是一个有帮助的助手。" },
  { role: "system", content: "你精通 TypeScript。" },
];
```

### 3.2 Model（模型）

Model 指定智能体使用的 LLM 提供商和模型。Mastra 支持 600+ 个模型。

```typescript
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

// OpenAI
model: openai("gpt-4o-mini")

// Anthropic
model: anthropic("claude-3-5-sonnet")

// 使用模型路由器
model: "openai/gpt-4o-mini"
```

### 3.3 Tools（工具）

Tools 让智能体能够执行超出语言生成的操作，如调用 API、查询数据库等。

```typescript
export const weatherAgent = new Agent({
  name: "weather-agent",
  instructions: "你是一个天气助手。使用 weatherTool 获取天气数据。",
  model: openai("gpt-4o-mini"),
  tools: { weatherTool },
});
```

---

## 4. 创建智能体

### 基本创建

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const testAgent = new Agent({
  name: "test-agent",
  instructions: "你是一个有帮助的助手。",
  model: openai("gpt-4o-mini"),
});
```

### 完整配置

```typescript
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { openai } from "@ai-sdk/openai";
import { weatherTool } from "../tools/weather-tool";

export const advancedAgent = new Agent({
  name: "advanced-agent",
  description: "一个具有记忆和工具的高级助手",
  instructions: `
    你是一个专业的助手。
    - 始终提供准确的信息
    - 使用可用的工具获取数据
    - 保持友好和专业
  `,
  model: openai("gpt-4o-mini"),
  tools: { weatherTool },
  memory: new Memory({
    options: {
      lastMessages: 20,
    },
  }),
});
```

### 配置参数说明

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | ✅ | 智能体名称 |
| `instructions` | string/array | ✅ | 系统提示词 |
| `model` | LanguageModel | ✅ | LLM 模型 |
| `description` | string | ❌ | 智能体描述 |
| `tools` | object | ❌ | 可用工具 |
| `memory` | Memory | ❌ | 记忆配置 |
| `voice` | Voice | ❌ | 语音配置 |
| `agents` | object | ❌ | 子智能体（网络模式） |
| `workflows` | object | ❌ | 关联工作流 |
| `scorers` | object | ❌ | 评分器配置 |

---

## 5. 调用智能体

### 5.1 生成响应（Generate）

生成完整响应后返回：

```typescript
const agent = mastra.getAgent("testAgent");

// 简单字符串
const response = await agent.generate("帮我组织今天的安排");
console.log(response.text);

// 消息数组
const response = await agent.generate([
  { role: "user", content: "帮我组织今天的安排" },
  { role: "user", content: "我的工作时间是 9 点到 17 点" },
]);
```

### 5.2 流式响应（Stream）

实时流式返回响应：

```typescript
const stream = await agent.stream([
  { role: "user", content: "帮我组织今天的安排" },
]);

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### 5.3 结构化输出

返回类型安全的结构化数据：

```typescript
import { z } from "zod";

const response = await agent.generate("总结这段文本", {
  structuredOutput: {
    schema: z.object({
      summary: z.string(),
      keywords: z.array(z.string()),
      sentiment: z.enum(["positive", "negative", "neutral"]),
    }),
  },
});

console.log(response.object.summary);
console.log(response.object.keywords);
```

---

## 6. 高级功能

### 6.1 Agent Memory（智能体记忆）

启用记忆以维护对话上下文：

```typescript
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

export const memoryAgent = new Agent({
  name: "memory-agent",
  instructions: "你是一个有记忆的助手",
  model: openai("gpt-4o-mini"),
  memory: new Memory({
    storage: new LibSQLStore({ url: ":memory:" }),
    options: {
      lastMessages: 20,
      semanticRecall: {
        topK: 3,
        messageRange: 2,
      },
      workingMemory: {
        enabled: true,
        template: `# 用户档案\n- 姓名:\n- 偏好:`,
      },
    },
  }),
});

// 使用记忆调用
const response = await memoryAgent.generate("记住我叫张三", {
  memory: {
    thread: "user-123",
    resource: "test-123",
  },
});
```

### 6.2 Agent Networks（智能体网络）

协调多个智能体处理复杂任务：

```typescript
export const routingAgent = new Agent({
  name: "routing-agent",
  instructions: `
    你是一个网络路由智能体。
    根据用户请求，将任务分配给合适的子智能体。
  `,
  model: openai("gpt-4o-mini"),
  agents: {
    researchAgent,  // 研究智能体
    writingAgent,   // 写作智能体
  },
  workflows: {
    dataWorkflow,   // 数据处理工作流
  },
  tools: {
    searchTool,     // 搜索工具
  },
  memory: new Memory({
    storage: new LibSQLStore({ url: "file:./network.db" }),
  }),
});

// 调用网络
const result = await routingAgent.network("研究 AI 发展趋势并撰写报告");

for await (const chunk of result) {
  console.log(chunk);
}
```

### 6.3 使用 RuntimeContext

根据请求上下文动态调整行为：

```typescript
export const dynamicAgent = new Agent({
  name: "dynamic-agent",
  instructions: "你是一个动态助手",
  model: ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier");
    return userTier === "enterprise"
      ? openai("gpt-4o")
      : openai("gpt-4o-mini");
  },
});
```

### 6.4 添加 Voice（语音）

为智能体添加语音能力：

```typescript
import { OpenAIVoice } from "@mastra/voice-openai";

export const voiceAgent = new Agent({
  name: "voice-agent",
  instructions: "你是一个语音助手",
  model: openai("gpt-4o"),
  voice: new OpenAIVoice(),
});

// 文本转语音
const audioStream = await voiceAgent.voice.speak("你好！");

// 语音转文本
const transcript = await voiceAgent.voice.listen(audioStream);
```

---

## 7. 注册与获取智能体

### 注册到 Mastra 实例

```typescript
import { Mastra } from "@mastra/core/mastra";
import { testAgent } from "./agents/test-agent";

export const mastra = new Mastra({
  agents: { testAgent },
});
```

### 获取智能体

```typescript
// 推荐：通过 mastra 实例获取
const agent = mastra.getAgent("testAgent");

// 这种方式可以访问 Mastra 实例的配置
// （logger, telemetry, storage, 注册的智能体和向量存储）
```

---

## 8. API 参考

### Agent 类方法

| 方法 | 描述 |
|------|------|
| `agent.generate(input, options)` | 生成完整响应 |
| `agent.stream(input, options)` | 流式生成响应 |
| `agent.network(input)` | 执行智能体网络 |
| `agent.voice.speak(text)` | 文本转语音 |
| `agent.voice.listen(audio)` | 语音转文本 |

### Generate/Stream 选项

| 选项 | 描述 |
|------|------|
| `memory` | 记忆配置（thread, resource） |
| `structuredOutput` | 结构化输出配置 |
| `maxSteps` | 最大 LLM 调用步数（默认 5） |
| `onStepFinish` | 步骤完成回调 |
| `toolsets` | 动态工具集 |

---

## 9. 最佳实践

1. **编写清晰的 Instructions** - 明确智能体的角色、能力和限制
2. **合理使用工具** - 只添加智能体需要的工具，避免过多选择
3. **配置适当的记忆** - 根据用例选择合适的记忆策略
4. **使用结构化输出** - 需要可预测格式时使用 Zod schema
5. **控制 maxSteps** - 限制迭代次数以控制成本和延迟
6. **通过 mastra.getAgent() 获取智能体** - 确保访问共享配置

---

## 10. 参考资料

- [Mastra 官方文档 - Agents](https://mastra.ai/docs/agents/overview)
- [Mastra 官方文档 - Agent Memory](https://mastra.ai/docs/agents/agent-memory)
- [Mastra 官方文档 - Using Tools](https://mastra.ai/docs/agents/using-tools)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

