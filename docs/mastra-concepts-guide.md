# Mastra 框架完整概念指南

> Mastra 是一个用于构建 AI 驱动应用程序和智能体的 TypeScript 框架

---

## 目录

1. [框架概述](#1-框架概述)
2. [Agents（智能体）](#2-agents智能体)
3. [Workflows（工作流）](#3-workflows工作流)
4. [Tools（工具）](#4-tools工具)
5. [Memory（记忆）](#5-memory记忆)
6. [RAG（检索增强生成）](#6-rag检索增强生成)
7. [Voice（语音）](#7-voice语音)
8. [Scorers（评分器）](#8-scorers评分器)
9. [MCP（模型上下文协议）](#9-mcp模型上下文协议)
10. [Streaming（流式传输）](#10-streaming流式传输)
11. [Storage（存储）](#11-storage存储)
12. [Runtime Context（运行时上下文）](#12-runtime-context运行时上下文)

---

## 1. 框架概述

### 什么是 Mastra？

Mastra 是由 Gatsby 团队开发的开源 TypeScript 框架，旨在简化 AI 应用的开发流程。它提供了从早期原型到生产就绪应用所需的一切。

### 核心特性

| 特性 | 描述 |
|------|------|
| **模型路由** | 通过统一接口连接 40+ 个 AI 提供商（OpenAI、Anthropic、Gemini 等） |
| **智能体（Agents）** | 构建使用 LLM 和工具解决任务的自主代理 |
| **工作流（Workflows）** | 使用图形化工作流引擎编排复杂的多步骤流程 |
| **Human-in-the-loop** | 暂停智能体或工作流，等待用户输入后继续 |
| **上下文管理** | 提供对话历史、RAG、工作记忆和语义记忆 |
| **集成** | 与 React、Next.js、Node.js 等框架集成 |
| **生产要素** | 内置评分器和可观察性工具 |

### 安装

```bash
# 使用 CLI 创建新项目
npm create mastra@latest

# 或手动安装
npm install @mastra/core zod
```

---

## 2. Agents（智能体）

### 概念定义

**Agents（智能体）** 是使用 LLM 和工具解决开放式任务的自主实体。它们能够：
- 推理目标
- 决定使用哪些工具
- 保留对话记忆
- 内部迭代直到产生最终答案

### 创建智能体

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const testAgent = new Agent({
  name: "test-agent",
  instructions: "你是一个有帮助的助手。",
  model: openai("gpt-4o-mini"),
  tools: { /* 工具配置 */ },
  memory: new Memory(), // 可选：启用记忆
});
```

### 智能体配置项

| 参数 | 描述 |
|------|------|
| `name` | 智能体名称 |
| `instructions` | 系统提示词，定义智能体的行为和个性 |
| `model` | LLM 模型（支持 600+ 个模型） |
| `tools` | 智能体可用的工具 |
| `memory` | 记忆配置（可选） |
| `voice` | 语音配置（可选） |
| `agents` | 子智能体（用于网络模式） |
| `workflows` | 关联的工作流 |

### 调用方式

```typescript
// 生成完整响应
const response = await agent.generate("帮我组织一下今天的安排");

// 流式响应
const stream = await agent.stream("帮我组织一下今天的安排");
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### 结构化输出

```typescript
import { z } from "zod";

const response = await agent.generate("总结这段文本", {
  structuredOutput: {
    schema: z.object({
      summary: z.string(),
      keywords: z.array(z.string()),
    }),
  },
});

console.log(response.object); // 类型安全的结构化数据
```

### Agent Networks（智能体网络）

智能体网络协调多个智能体、工作流和工具来处理复杂任务。

```typescript
export const routingAgent = new Agent({
  name: "routing-agent",
  instructions: "你是一个网络路由智能体...",
  model: openai("gpt-4o-mini"),
  agents: { researchAgent, writingAgent },
  workflows: { cityWorkflow },
  tools: { weatherTool },
  memory: new Memory({ /* 配置 */ }),
});

// 调用网络
const result = await routingAgent.network("研究海豚并写一份报告");
```

---

## 3. Workflows（工作流）

### 概念定义

**Workflows（工作流）** 让你定义复杂的任务序列，使用清晰、结构化的步骤，而不是依赖单个智能体的推理。工作流提供对任务分解、数据流动和执行顺序的完全控制。

### 核心原则

1. 第一个步骤的 `inputSchema` 必须匹配工作流的 `inputSchema`
2. 最后一个步骤的 `outputSchema` 必须匹配工作流的 `outputSchema`
3. 每个步骤的 `outputSchema` 必须匹配下一个步骤的 `inputSchema`

### 创建工作流步骤

```typescript
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({
  id: "step-1",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ formatted: z.string() }),
  execute: async ({ inputData }) => {
    return { formatted: inputData.message.toUpperCase() };
  },
});
```

### 创建工作流

```typescript
export const testWorkflow = createWorkflow({
  id: "test-workflow",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ output: z.string() }),
})
  .then(step1)
  .then(step2)
  .commit();
```

### 控制流方法

| 方法 | 描述 |
|------|------|
| `.then(step)` | 顺序执行步骤 |
| `.parallel([steps])` | 并行执行多个步骤 |
| `.branch([conditions])` | 条件分支 |
| `.dountil(step, condition)` | 循环直到条件为真 |
| `.dowhile(step, condition)` | 循环当条件为真 |
| `.foreach(step)` | 遍历数组中的每个元素 |
| `.map(fn)` | 数据转换映射 |
| `.sleep(ms)` | 暂停指定毫秒 |
| `.sleepUntil(date)` | 暂停直到指定日期 |

### Suspend & Resume（暂停与恢复）

工作流可以在任何步骤暂停，以收集额外数据、等待 API 回调或请求人工输入。

```typescript
const step1 = createStep({
  id: "step-1",
  resumeSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({ reason: z.string() }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const { approved } = resumeData ?? {};

    if (!approved) {
      return await suspend({ reason: "需要人工审批" });
    }

    return { output: "已批准" };
  },
});
```

### Time Travel（时间旅行）

Time Travel 允许从特定步骤重新执行工作流，而无需从头开始。

**使用场景：**
- 调试失败的工作流
- 测试单个步骤的逻辑
- 从暂停状态恢复
- 从错误中恢复

```typescript
const result = await run.timeTravel({
  step: "step2",
  inputData: { correctedData: newData },
});
```

### Snapshots（快照）

快照是工作流在特定时间点的完整执行状态的可序列化表示，包括：
- 每个步骤的当前状态
- 已完成步骤的输出
- 执行路径
- 暂停的步骤及其元数据

---

## 4. Tools（工具）

### 概念定义

**Tools（工具）** 让智能体能够调用 API、查询数据库或运行代码库中的自定义函数。工具通过提供对数据的结构化访问和执行明确定义的操作，扩展了智能体的能力。

### 工具定义

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const weatherTool = createTool({
  id: "weather-tool",
  description: "获取指定位置的天气信息",
  inputSchema: z.object({
    location: z.string(),
  }),
  outputSchema: z.object({
    weather: z.string(),
  }),
  execute: async ({ context }) => {
    const { location } = context;
    const response = await fetch(`https://wttr.in/${location}?format=3`);
    return { weather: await response.text() };
  },
});
```

### 工具组成部分

| 部分 | 描述 |
|------|------|
| `id` | 工具唯一标识符 |
| `description` | 帮助智能体理解何时使用该工具 |
| `inputSchema` | 定义工具需要的输入数据结构 |
| `outputSchema` | 定义工具返回的数据结构 |
| `execute` | 执行工具操作的函数 |

### 将工具添加到智能体

```typescript
export const weatherAgent = new Agent({
  name: "weather-agent",
  instructions: "你是一个有帮助的天气助手。使用 weatherTool 获取天气数据。",
  model: openai("gpt-4o-mini"),
  tools: { weatherTool },
});
```

---

## 5. Memory（记忆）

### 概念定义

**Memory（记忆）** 帮助智能体在交互之间维护上下文。由于 LLM 是无状态的，智能体需要记忆来跟踪对话历史和回忆相关信息。

### 记忆类型

| 类型 | 描述 |
|------|------|
| **Working Memory（工作记忆）** | 存储持久的用户特定详细信息（姓名、偏好、目标） |
| **Conversation History（对话历史）** | 捕获当前对话的最近消息 |
| **Semantic Recall（语义回忆）** | 基于语义相关性从过去的对话中检索消息 |

### 配置记忆

```typescript
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

export const memoryAgent = new Agent({
  // ...
  memory: new Memory({
    storage: new LibSQLStore({ url: ":memory:" }),
    options: {
      lastMessages: 20, // 对话历史
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
```

### 线程和资源

Mastra 使用两级作用域系统组织记忆：

- **Thread（线程）**：代表对话的全局唯一 ID
- **Resource（资源）**：拥有该线程的用户或实体

```typescript
const response = await agent.generate("记住我喜欢蓝色", {
  memory: {
    thread: "user-123",
    resource: "test-123",
  },
});
```

---

## 6. RAG（检索增强生成）

### 概念定义

**RAG（Retrieval-Augmented Generation）** 通过从数据源检索相关上下文来增强 LLM 输出，提高准确性并将响应建立在真实信息之上。

### RAG 流程

```
1. 处理文档 → 2. 分块 → 3. 生成嵌入 → 4. 存储到向量数据库 → 5. 查询相似内容
```

### 文档处理和分块

```typescript
import { MDocument } from "@mastra/rag";

// 从不同格式初始化
const doc = MDocument.fromText("你的文本内容...");
const docHTML = MDocument.fromHTML("<html>内容</html>");
const docMD = MDocument.fromMarkdown("# 标题");

// 分块策略
const chunks = await doc.chunk({
  strategy: "recursive", // recursive, character, token, markdown, html, json
  maxSize: 512,
  overlap: 50,
});
```

### 分块策略

| 策略 | 描述 |
|------|------|
| `recursive` | 基于内容结构的智能分割 |
| `character` | 简单的字符分割 |
| `token` | 令牌感知分割 |
| `markdown` | Markdown 感知分割 |
| `semantic-markdown` | 基于相关标题家族的 Markdown 分割 |
| `html` | HTML 结构感知分割 |
| `json` | JSON 结构感知分割 |
| `sentence` | 句子感知分割 |

### 生成嵌入

```typescript
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const { embeddings } = await embedMany({
  model: openai.embedding("text-embedding-3-small"),
  values: chunks.map((chunk) => chunk.text),
});
```

### 支持的向量数据库

| 数据库 | 包名 |
|--------|------|
| PostgreSQL (pgvector) | `@mastra/pg` |
| Pinecone | `@mastra/pinecone` |
| Qdrant | `@mastra/qdrant` |
| Chroma | `@mastra/chroma` |
| MongoDB | `@mastra/mongodb` |
| LibSQL | `@mastra/libsql` |
| Upstash | `@mastra/upstash` |

### 检索方法

```typescript
// 基本语义搜索
const results = await pgVector.query({
  indexName: "embeddings",
  queryVector: embedding,
  topK: 10,
});

// 元数据过滤
const results = await pgVector.query({
  indexName: "embeddings",
  queryVector: embedding,
  topK: 10,
  filter: { category: "技术" },
});
```

---

## 7. Voice（语音）

### 概念定义

**Voice（语音）** 系统提供统一的语音交互接口，包括文本转语音（TTS）、语音转文本（STT）和实时语音到语音（STS）功能。

### 语音功能

| 功能 | 描述 |
|------|------|
| **TTS（文本转语音）** | 将智能体的响应转换为自然语音 |
| **STT（语音转文本）** | 转录语音内容 |
| **STS（语音到语音）** | 实时双向语音交互 |

### 支持的提供商

| 提供商 | 包名 | 功能 |
|--------|------|------|
| OpenAI | `@mastra/voice-openai` | TTS, STT |
| OpenAI Realtime | `@mastra/voice-openai-realtime` | 实时 STS |
| ElevenLabs | `@mastra/voice-elevenlabs` | 高质量 TTS |
| Google | `@mastra/voice-google` | TTS, STT |
| Azure | `@mastra/voice-azure` | TTS, STT |
| Deepgram | `@mastra/voice-deepgram` | STT |
| PlayAI | `@mastra/voice-playai` | TTS |

### 基本使用

```typescript
import { Agent } from "@mastra/core/agent";
import { OpenAIVoice } from "@mastra/voice-openai";

const voiceAgent = new Agent({
  name: "Voice Agent",
  instructions: "你是一个语音助手",
  model: openai("gpt-4o"),
  voice: new OpenAIVoice(),
});

// 文本转语音
const audioStream = await voiceAgent.voice.speak("你好！");

// 语音转文本
const transcript = await voiceAgent.voice.listen(audioStream);
```

### 实时语音交互

```typescript
import { OpenAIRealtimeVoice } from "@mastra/voice-openai-realtime";

const voice = new OpenAIRealtimeVoice();

// 连接到语音服务
await agent.voice.connect();

// 监听音频响应
agent.voice.on("speaker", ({ audio }) => {
  playAudio(audio);
});

// 开始对话
await agent.voice.speak("有什么可以帮助你的？");

// 发送麦克风音频
const micStream = getMicrophoneStream();
await agent.voice.send(micStream);
```

---

## 8. Scorers（评分器）

### 概念定义

**Scorers（评分器）** 是自动化测试，用于评估智能体输出。评分器返回分数（通常在 0 到 1 之间），量化输出满足评估标准的程度。

### 评分器类型

| 类型 | 描述 |
|------|------|
| **准确性和可靠性** | 评估答案的正确性、真实性和完整性 |
| **上下文质量** | 评估生成响应时使用的上下文质量 |
| **输出质量** | 评估格式、风格和安全要求的遵守情况 |

### 内置评分器

| 评分器 | 描述 |
|--------|------|
| `answer-relevancy` | 评估响应如何解决输入查询 |
| `faithfulness` | 测量响应对提供上下文的准确表示 |
| `hallucination` | 检测事实矛盾和无支持的声明 |
| `completeness` | 检查响应是否包含所有必要信息 |
| `toxicity` | 检测有害或不当内容 |
| `bias` | 检测输出中的潜在偏见 |
| `tone-consistency` | 测量正式性、复杂性和风格的一致性 |

### 添加评分器到智能体

```typescript
import { createAnswerRelevancyScorer, createToxicityScorer } from "@mastra/evals/scorers/llm";

export const evaluatedAgent = new Agent({
  // ...
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: openai("gpt-4o-mini") }),
      sampling: { type: "ratio", rate: 0.5 },
    },
    safety: {
      scorer: createToxicityScorer({ model: openai("gpt-4o-mini") }),
      sampling: { type: "ratio", rate: 1 },
    },
  },
});
```

### 自定义评分器

```typescript
import { createScorer } from "@mastra/core/scores";

export const glutenCheckerScorer = createScorer({
  name: "Gluten Checker",
  description: "检查配方是否含有麸质",
  judge: {
    model: openai("gpt-4o"),
    instructions: "你是一个识别配方中麸质的厨师",
  },
})
  .analyze({
    description: "分析输出中的麸质",
    outputSchema: z.object({
      isGlutenFree: z.boolean(),
      glutenSources: z.array(z.string()),
    }),
    createPrompt: ({ run }) => `检查这个配方是否无麸质：${run.output.text}`,
  })
  .generateScore(({ results }) => {
    return results.analyzeStepResult.isGlutenFree ? 1 : 0;
  })
  .generateReason({
    description: "生成评分原因",
    createPrompt: ({ results }) => `解释为什么这个配方${results.analyzeStepResult.isGlutenFree ? "无麸质" : "含有麸质"}`,
  });
```

---

## 9. MCP（模型上下文协议）

### 概念定义

**MCP（Model Context Protocol）** 是连接 AI 智能体到外部工具和资源的开放标准。它作为通用插件系统，使智能体能够调用工具，无论语言或托管环境如何。

### 两个核心类

| 类 | 描述 |
|---|------|
| `MCPClient` | 连接到一个或多个 MCP 服务器以访问其工具 |
| `MCPServer` | 将 Mastra 工具、智能体、工作流暴露给 MCP 兼容的客户端 |

### 配置 MCPClient

```typescript
import { MCPClient } from "@mastra/mcp";

export const mcp = new MCPClient({
  id: "test-mcp-client",
  servers: {
    wikipedia: {
      command: "npx",
      args: ["-y", "wikipedia-mcp"],
    },
    weather: {
      url: new URL("https://server.smithery.ai/@smithery-ai/national-weather-service/mcp"),
    },
  },
});
```

### 在智能体中使用 MCP 工具

```typescript
export const testAgent = new Agent({
  name: "Test Agent",
  instructions: "你是一个有帮助的助手，可以访问 MCP 服务器",
  model: openai("gpt-4o-mini"),
  tools: await mcp.getTools(),
});
```

### 配置 MCPServer

```typescript
import { MCPServer } from "@mastra/mcp";

export const testMcpServer = new MCPServer({
  id: "test-mcp-server",
  name: "Test Server",
  version: "1.0.0",
  agents: { testAgent },
  tools: { testTool },
  workflows: { testWorkflow },
});
```

### 支持的 MCP 注册表

- **Klavis AI** - 企业级托管 MCP 服务器
- **mcp.run** - 预认证的托管 MCP 服务器
- **Composio.dev** - SSE 基于的 MCP 服务器注册表
- **Smithery.ai** - 通过 CLI 访问的注册表
- **Ampersand** - 150+ SaaS 产品集成

---

## 10. Streaming（流式传输）

### 概念定义

**Streaming（流式传输）** 支持从智能体和工作流实时、增量地响应，允许用户在生成时看到输出，而不是等待完成。

### 智能体流式传输

```typescript
const stream = await testAgent.stream([
  { role: "user", content: "帮我组织一下今天的安排" },
]);

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### 工作流流式传输

```typescript
const run = await testWorkflow.createRunAsync();

const stream = await run.stream({
  inputData: { value: "初始数据" },
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

### 流事件类型

| 事件 | 描述 |
|------|------|
| `start` | 标记运行开始 |
| `step-start` | 工作流步骤开始执行 |
| `text-delta` | LLM 生成的增量文本块 |
| `tool-call` | 智能体决定使用工具 |
| `tool-result` | 工具执行返回的结果 |
| `step-finish` | 步骤完成 |
| `finish` | 智能体或工作流完成 |

### 工具流式传输

```typescript
export const testTool = createTool({
  // ...
  execute: async ({ context, writer }) => {
    await writer?.write({ type: "custom-event", status: "pending" });
    
    const response = await fetch(...);
    
    await writer?.write({ type: "custom-event", status: "success" });
    
    return { value: response };
  },
});
```

---

## 11. Storage（存储）

### 概念定义

**Storage（存储）** 提供持久化记忆、工作流快照和其他数据的能力。

### 支持的存储提供商

| 提供商 | 包名 |
|--------|------|
| LibSQL | `@mastra/libsql` |
| PostgreSQL | `@mastra/pg` |
| Upstash | `@mastra/upstash` |
| MongoDB | `@mastra/mongodb` |

### 配置存储

```typescript
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";

export const mastra = new Mastra({
  // ...
  storage: new LibSQLStore({
    url: "file:../mastra.db", // 文件存储
    // url: ":memory:", // 内存存储（开发用）
  }),
});
```

---

## 12. Runtime Context（运行时上下文）

### 概念定义

**RuntimeContext（运行时上下文）** 允许访问请求特定的值，让你可以根据请求的上下文有条件地调整行为。

### 使用场景

```typescript
export type UserTier = {
  "user-tier": "enterprise" | "pro";
};

export const testAgent = new Agent({
  // ...
  model: ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier") as UserTier["user-tier"];
    
    return userTier === "enterprise"
      ? openai("gpt-4o-mini")
      : openai("gpt-4.1-nano");
  },
});
```

### 在工作流中使用

```typescript
const step1 = createStep({
  // ...
  execute: async ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier");
    const maxResults = userTier === "enterprise" ? 1000 : 50;
    return { maxResults };
  },
});
```

### 在工具中使用

```typescript
export const testTool = createTool({
  // ...
  execute: async ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier");
    return userTier === "enterprise" ? advancedTools() : baseTools();
  },
});
```

---

## 参考资料

- [Mastra 官方文档](https://mastra.ai/docs)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)
- [Mastra YouTube 频道](https://www.youtube.com/@mastra-ai)
- [Mastra Discord 社区](https://discord.gg/BTYqqHKUrf)

---

*文档生成日期：2025年12月10日*

