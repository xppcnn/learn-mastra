# Mastra Agents（智能体）专题指南

## 1. 什么是 Agents？

Agents（智能体）是使用 LLM 和工具解决开放式任务的自主实体。它们能够推理目标、决定使用哪些工具、保留对话记忆，并内部迭代直到产生最终答案。

### 核心能力
- 🤖 **自主推理** - 分析问题并制定解决方案
- 🔧 **工具调用** - 调用 API、数据库或自定义函数
- 💬 **对话记忆** - 跨交互维护上下文
- 📊 **结构化输出** - 返回类型安全的数据

---

## 2. 创建智能体

### 2.1 基本配置

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const testAgent = new Agent({
  name: "test-agent",
  instructions: "你是一个有帮助的助手。",
  model: openai("gpt-4o-mini"),
});
```

### 2.2 使用 Model Router

Mastra 的 Model Router 自动检测环境变量中的 API 密钥：

```typescript
export const testAgent = new Agent({
  name: "test-agent",
  instructions: "你是一个有帮助的助手。",
  model: "openai/gpt-4o-mini", // 使用 provider/model 格式
});
```

### 2.3 完整配置

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { OpenAIVoice } from "@mastra/voice-openai";

export const fullAgent = new Agent({
  name: "full-agent",
  description: "一个功能完整的智能体",
  instructions: `
    你是一个专业的助手。
    - 始终保持礼貌
    - 提供详细的答案
    - 在不确定时请求澄清
  `,
  model: openai("gpt-4o-mini"),
  tools: { weatherTool, searchTool },
  memory: new Memory(),
  voice: new OpenAIVoice(),
});
```

---

## 3. 配置参数详解

| 参数 | 类型 | 描述 |
|------|------|------|
| `name` | `string` | 智能体名称（必需） |
| `instructions` | `string \| string[] \| SystemMessage[]` | 系统提示词 |
| `model` | `LanguageModel \| string` | LLM 模型 |
| `description` | `string` | 智能体描述 |
| `tools` | `Record<string, Tool>` | 可用工具 |
| `memory` | `Memory` | 记忆配置 |
| `voice` | `Voice` | 语音配置 |
| `agents` | `Record<string, Agent>` | 子智能体（用于网络） |
| `workflows` | `Record<string, Workflow>` | 关联的工作流 |
| `scorers` | `Record<string, Scorer>` | 评分器配置 |

### 3.1 Instructions 格式

```typescript
// 字符串格式（最常用）
instructions: "你是一个有帮助的助手。";

// 数组格式
instructions: [
  "你是一个有帮助的助手。",
  "始终保持礼貌。",
  "提供详细的答案。"
];

// 系统消息数组格式
instructions: [
  { role: "system", content: "你是一个有帮助的助手。" },
  { role: "system", content: "你精通 TypeScript。" }
];

// 带 Provider 选项
instructions: {
  role: "system",
  content: "你是一个专业的代码审查员。",
  providerOptions: {
    openai: { reasoningEffort: "high" },
    anthropic: { cacheControl: { type: "ephemeral" } }
  }
};
```

---

## 4. 调用智能体

### 4.1 使用 generate()

```typescript
// 简单字符串
const response = await agent.generate("帮我组织今天的安排");
console.log(response.text);

// 消息数组
const response = await agent.generate([
  { role: "user", content: "帮我组织今天的安排" },
  { role: "user", content: "我的日程从 9 点开始，5:30 结束" }
]);
```

### 4.2 使用 stream()

```typescript
const stream = await agent.stream([
  { role: "user", content: "帮我组织今天的安排" }
]);

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

// 完成回调
const stream = await agent.stream("帮我组织今天的安排", {
  onFinish: ({ steps, text, finishReason, usage }) => {
    console.log({ steps, text, finishReason, usage });
  }
});
```

### 4.3 结构化输出

```typescript
import { z } from "zod";

const response = await agent.generate(
  "总结并提取关键词：猴子、冰淇淋、船",
  {
    structuredOutput: {
      schema: z.object({
        summary: z.string(),
        keywords: z.array(z.string()),
      }),
    },
  }
);

console.log(response.object);
// { summary: "...", keywords: ["猴子", "冰淇淋", "船"] }
```

---

## 5. Agent Networks（智能体网络）

### 5.1 概念

智能体网络协调多个智能体、工作流和工具来处理复杂任务。顶级路由智能体使用 LLM 来解释请求并决定调用哪些原语。

### 5.2 创建网络

```typescript
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

// 子智能体
const researchAgent = new Agent({
  name: "research-agent",
  description: "收集研究见解，以要点形式提取关键事实。",
  // ...
});

const writingAgent = new Agent({
  name: "writing-agent",
  description: "将研究材料转化为结构良好的书面内容。",
  // ...
});

// 路由智能体（需要 memory）
export const routingAgent = new Agent({
  name: "routing-agent",
  instructions: `
    你是一个作家和研究员网络。
    用户会要求你研究一个主题。
    始终以完整报告的形式回应——不要使用要点。
  `,
  model: openai("gpt-4o-mini"),
  agents: { researchAgent, writingAgent },
  workflows: { cityWorkflow },
  tools: { weatherTool },
  memory: new Memory({
    storage: new LibSQLStore({ url: "file:../mastra.db" }),
  }),
});
```

### 5.3 调用网络

```typescript
const result = await routingAgent.network("研究海豚并写一份报告");

for await (const chunk of result) {
  console.log(chunk.type);
  if (chunk.type === "network-execution-event-step-finish") {
    console.log(chunk.payload.result);
  }
}
```

---

## 6. 智能体与工具

### 6.1 添加工具

```typescript
import { weatherTool } from "../tools/weather-tool";

export const weatherAgent = new Agent({
  name: "weather-agent",
  instructions: `
    你是一个有帮助的天气助手。
    使用 weatherTool 获取当前天气数据。
  `,
  model: openai("gpt-4o-mini"),
  tools: { weatherTool },
});
```

### 6.2 工具调用示例

```typescript
const result = await weatherAgent.generate("伦敦的天气怎么样？");
// 智能体会自动调用 weatherTool 并整合结果
```

---

## 7. 智能体与记忆

### 7.1 启用记忆

```typescript
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

export const memoryAgent = new Agent({
  // ...
  memory: new Memory({
    storage: new LibSQLStore({ url: ":memory:" }),
    options: {
      lastMessages: 20,
      semanticRecall: { topK: 3 },
      workingMemory: { enabled: true },
    },
  }),
});
```

### 7.2 使用线程

```typescript
const response = await memoryAgent.generate("记住我最喜欢的颜色是蓝色", {
  memory: {
    thread: "user-123",
    resource: "test-123",
  },
});

// 后续对话
const response2 = await memoryAgent.generate("我最喜欢的颜色是什么？", {
  memory: {
    thread: "user-123",
    resource: "test-123",
  },
});
// 智能体会记住蓝色
```

---

## 8. 智能体与语音

### 8.1 添加语音能力

```typescript
import { OpenAIVoice } from "@mastra/voice-openai";

export const voiceAgent = new Agent({
  name: "voice-agent",
  instructions: "你是一个语音助手。",
  model: openai("gpt-4o"),
  voice: new OpenAIVoice(),
});

// 文本转语音
const { text } = await voiceAgent.generate("今天天气怎么样？");
const audioStream = await voiceAgent.voice.speak(text);

// 语音转文本
const transcript = await voiceAgent.voice.listen(audioStream);
```

---

## 9. 使用 RuntimeContext

RuntimeContext 允许根据请求上下文动态调整智能体行为：

```typescript
export type UserTier = {
  "user-tier": "enterprise" | "pro";
};

export const dynamicAgent = new Agent({
  // ...
  model: ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier") as UserTier["user-tier"];
    return userTier === "enterprise"
      ? openai("gpt-4o")
      : openai("gpt-4o-mini");
  },
});
```

---

## 10. 处理图像

智能体可以分析和描述图像：

```typescript
const response = await agent.generate([
  {
    role: "user",
    content: [
      {
        type: "image",
        image: "https://example.com/image.jpg",
        mimeType: "image/jpeg",
      },
      {
        type: "text",
        text: "详细描述这张图片。",
      },
    ],
  },
]);

console.log(response.text);
```

---

## 11. 注册智能体

在 Mastra 实例中注册智能体，使其可在整个应用程序中使用：

```typescript
import { Mastra } from "@mastra/core/mastra";
import { testAgent } from "./agents/test-agent";

export const mastra = new Mastra({
  agents: { testAgent },
});

// 获取智能体
const agent = mastra.getAgent("testAgent");
```

---

## 12. 最佳实践

1. **清晰的 Instructions** - 明确定义智能体的角色和行为
2. **适当的模型选择** - 根据任务复杂度选择合适的模型
3. **工具描述** - 为工具提供清晰的描述，帮助智能体决定何时使用
4. **记忆管理** - 合理配置记忆，避免上下文过长
5. **错误处理** - 处理工具调用失败和 API 错误
6. **使用 RuntimeContext** - 根据用户或请求动态调整行为

---

## 13. 参考资料

- [Mastra 官方文档 - Agents](https://mastra.ai/docs/agents/overview)
- [Mastra 官方文档 - Using Tools](https://mastra.ai/docs/agents/using-tools)
- [Mastra 官方文档 - Agent Memory](https://mastra.ai/docs/agents/agent-memory)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

