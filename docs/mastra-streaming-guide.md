# Mastra Streaming（流式传输）专题指南

## 1. 什么是 Streaming？

Streaming（流式传输）支持从智能体和工作流实时、增量地响应，允许用户在生成时看到输出，而不是等待完成。

### 核心能力
- ⚡ **实时响应** - 逐块显示生成的内容
- 📊 **进度追踪** - 监控工作流执行进度
- 🔧 **工具流** - 工具执行时发送增量结果
- 📡 **事件系统** - 丰富的事件类型用于不同场景

---

## 2. 流式传输 API

| 方法 | 模型版本 | 描述 |
|------|----------|------|
| `.stream()` | AI SDK v5 (LanguageModelV2) | 推荐使用 |
| `.streamLegacy()` | AI SDK v4 (LanguageModelV1) | 旧版本兼容 |

---

## 3. 智能体流式传输

### 3.1 基本使用

```typescript
const agent = mastra.getAgent("testAgent");

const stream = await agent.stream([
  { role: "user", content: "帮我组织今天的安排" },
]);

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### 3.2 流属性

| 属性 | 描述 |
|------|------|
| `stream.textStream` | 发出文本块的可读流 |
| `stream.text` | 解析为完整文本响应的 Promise |
| `stream.finishReason` | 智能体停止流式传输的原因 |
| `stream.usage` | Token 使用信息 |

### 3.3 完整流检查

```typescript
const stream = await agent.stream([
  { role: "user", content: "帮我组织今天的安排" },
]);

// 检查所有事件块
for await (const chunk of stream) {
  console.log(chunk);
}
```

### 3.4 AI SDK v5 兼容

```typescript
const stream = await agent.stream(
  [{ role: "user", content: "帮我组织今天的安排" }],
  { format: "aisdk" } // 获取 AISDKV5OutputStream
);

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

---

## 4. 工作流流式传输

### 4.1 基本使用

```typescript
const workflow = mastra.getWorkflow("testWorkflow");
const run = await workflow.createRunAsync();

const stream = await run.stream({
  inputData: { message: "Hello world" },
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

### 4.2 使用 streamVNext（实验性）

```typescript
const run = await workflow.createRunAsync();

const stream = await run.streamVNext({
  inputData: { value: "initial data" },
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

### 4.3 流属性

| 属性 | 描述 |
|------|------|
| `stream.status` | 工作流运行状态 |
| `stream.result` | 工作流运行结果 |
| `stream.usage` | 工作流运行的总 Token 使用量 |

### 4.4 恢复中断的流

```typescript
// 如果流被关闭或中断，可以恢复
const newStream = await run.resumeStreamVNext();

for await (const chunk of newStream) {
  console.log(chunk);
}
```

---

## 5. 流事件类型

### 5.1 智能体事件

| 事件 | 描述 |
|------|------|
| `start` | 智能体运行开始 |
| `step-start` | 步骤开始执行 |
| `text-delta` | LLM 生成的增量文本块 |
| `tool-call` | 智能体决定使用工具 |
| `tool-result` | 工具执行返回的结果 |
| `step-finish` | 步骤完成 |
| `finish` | 智能体完成 |

### 5.2 工作流事件

| 事件 | 描述 |
|------|------|
| `workflow-start` | 工作流开始 |
| `workflow-step-start` | 工作流步骤开始 |
| `workflow-step-result` | 步骤结果 |
| `workflow-finish` | 工作流完成 |

### 5.3 网络事件（Agent Networks）

| 事件 | 描述 |
|------|------|
| `routing-agent-start` | 路由智能体开始分析 |
| `routing-agent-text-delta` | 路由智能体处理的增量文本 |
| `routing-agent-end` | 路由智能体完成选择 |
| `agent-execution-start` | 委托的智能体开始执行 |
| `agent-execution-end` | 委托的智能体完成执行 |
| `workflow-execution-start` | 委托的工作流开始执行 |
| `workflow-execution-end` | 委托的工作流完成执行 |
| `tool-execution-start` | 委托的工具开始执行 |
| `tool-execution-end` | 委托的工具完成执行 |
| `network-execution-event-step-finish` | 网络迭代步骤完成 |
| `network-execution-event-finish` | 整个网络执行完成 |

---

## 6. 智能体网络流式传输

### 6.1 基本使用

```typescript
const networkAgent = mastra.getAgent("networkAgent");

const networkStream = await networkAgent.network("研究海豚并写一份报告");

for await (const chunk of networkStream) {
  console.log(chunk);
}
```

### 6.2 网络流属性

```typescript
const networkStream = await networkAgent.network("研究海豚并写一份报告");

for await (const chunk of networkStream) {
  console.log(chunk);
}

console.log("最终状态:", await networkStream.status);
console.log("最终结果:", await networkStream.result);
console.log("Token 使用:", await networkStream.usage);
```

### 6.3 过滤网络事件

```typescript
for await (const chunk of networkStream) {
  // 追踪路由决策
  if (chunk.type === "routing-agent-end") {
    console.log("选择:", chunk.payload.resourceType, chunk.payload.resourceId);
    console.log("原因:", chunk.payload.selectionReason);
  }

  // 追踪智能体委托
  if (chunk.type === "agent-execution-start") {
    console.log("委托给智能体:", chunk.payload.agentId);
  }

  // 追踪工作流委托
  if (chunk.type === "workflow-execution-start") {
    console.log("执行工作流:", chunk.payload.name);
  }
}
```

---

## 7. 工具流式传输

### 7.1 使用 writer

```typescript
import { createTool } from "@mastra/core/tools";

export const progressTool = createTool({
  id: "progress-tool",
  description: "执行长时间任务并报告进度",
  inputSchema: z.object({ taskId: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ context, writer }) => {
    // 发送进度事件
    await writer?.write({
      type: "progress",
      percent: 0,
    });

    await processStep1();
    await writer?.write({ type: "progress", percent: 33 });

    await processStep2();
    await writer?.write({ type: "progress", percent: 66 });

    await processStep3();
    await writer?.write({ type: "progress", percent: 100 });

    return { result: "任务完成" };
  },
});
```

### 7.2 使用 writer.custom

```typescript
execute: async ({ context, writer }) => {
  // 发出顶级流块（用于 UI 框架集成）
  await writer?.custom({
    type: "data-tool-progress",
    status: "pending",
  });

  const response = await fetch(...);

  await writer?.custom({
    type: "data-tool-progress",
    status: "success",
  });

  return { value: response };
}
```

### 7.3 检查工具流事件

```typescript
const stream = await agent.stream([
  "执行任务",
  "使用 progressTool",
]);

for await (const chunk of stream) {
  if (chunk.payload.output?.type === "progress") {
    console.log(`进度: ${chunk.payload.output.percent}%`);
  }
}
```

### 7.4 工具中使用智能体流

```typescript
export const analysisToolWithAgent = createTool({
  id: "analysis-tool",
  description: "使用 AI 分析数据",
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ analysis: z.string() }),
  execute: async ({ context, mastra, writer }) => {
    const agent = mastra?.getAgent("analysisAgent");
    const stream = await agent?.stream(`分析以下数据: ${context.data}`);

    // 将智能体的输出流式传输到工具的 writer
    await stream!.textStream.pipeTo(writer!);

    return { analysis: await stream!.text };
  },
});
```

---

## 8. 工作流步骤流式传输

### 8.1 使用 writer

```typescript
import { createStep } from "@mastra/core/workflows";

const progressStep = createStep({
  id: "progress-step",
  inputSchema: z.object({ value: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData, writer }) => {
    await writer?.write({
      type: "step-progress",
      status: "started",
    });

    const result = await processData(inputData.value);

    await writer?.write({
      type: "step-progress",
      status: "completed",
    });

    return { result };
  },
});
```

### 8.2 步骤中使用智能体流

```typescript
const agentStep = createStep({
  id: "agent-step",
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({ value: z.string() }),
  execute: async ({ inputData, mastra, writer }) => {
    const agent = mastra?.getAgent("weatherAgent");
    const stream = await agent?.stream(`${inputData.city}的天气怎么样？`);

    await stream!.textStream.pipeTo(writer!);

    return { value: await stream!.text };
  },
});
```

---

## 9. 事件输出示例

### 9.1 智能体事件示例

```typescript
{
  type: 'start',
  from: 'AGENT',
}
{
  type: 'step-start',
  from: 'AGENT',
  payload: {
    messageId: 'msg-cdUrkirvXw8A6oE4t5lzDuxi',
  }
}
{
  type: 'tool-call',
  from: 'AGENT',
  payload: {
    toolCallId: 'call_jbhi3s1qvR6Aqt9axCfTBMsA',
    toolName: 'weatherTool'
  }
}
{
  type: 'text-delta',
  from: 'AGENT',
  payload: {
    delta: '今天',
  }
}
```

### 9.2 工作流事件示例

```typescript
{
  type: 'workflow-start',
  runId: '221333ed-d9ee-4737-922b-4ab4d9de73e6',
  from: 'WORKFLOW',
}
{
  type: 'step-start',
  runId: '221333ed-d9ee-4737-922b-4ab4d9de73e6',
  from: 'WORKFLOW',
  payload: {
    stepName: 'step-1',
    args: { value: 'initial data' },
    stepCallId: '9e8c5217-490b-4fe7-8c31-6e2353a3fc98',
    startedAt: 1755269732792,
    status: 'running'
  }
}
```

---

## 10. 完整示例

```typescript
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// 创建带流式输出的工具
const progressTool = createTool({
  id: "progress-tool",
  description: "执行任务并报告进度",
  inputSchema: z.object({ task: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ context, writer }) => {
    for (let i = 0; i <= 100; i += 20) {
      await writer?.write({ type: "progress", percent: i });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return { result: `任务 "${context.task}" 完成` };
  },
});

// 创建智能体
const streamAgent = new Agent({
  name: "Stream Agent",
  instructions: "你是一个有帮助的助手。使用 progressTool 执行任务。",
  model: openai("gpt-4o-mini"),
  tools: { progressTool },
});

// 配置 Mastra
const mastra = new Mastra({
  agents: { streamAgent },
});

// 使用流式传输
async function main() {
  const agent = mastra.getAgent("streamAgent");

  console.log("开始流式传输...\n");

  const stream = await agent.stream("执行一个测试任务");

  for await (const chunk of stream) {
    // 处理文本增量
    if (chunk.type === "text-delta") {
      process.stdout.write(chunk.payload.delta);
    }
    
    // 处理工具调用
    if (chunk.type === "tool-call") {
      console.log(`\n工具调用: ${chunk.payload.toolName}`);
    }
    
    // 处理自定义进度事件
    if (chunk.payload?.output?.type === "progress") {
      console.log(`进度: ${chunk.payload.output.percent}%`);
    }
  }

  console.log("\n\n流式传输完成");
  console.log("完整响应:", await stream.text);
}

main().catch(console.error);
```

---

## 11. 最佳实践

1. **使用 textStream** - 简单文本输出使用 `stream.textStream`
2. **检查完整流** - 需要所有事件时迭代 `stream` 本身
3. **等待 writer** - 始终 `await` `writer.write()` 调用
4. **处理中断** - 使用 `resumeStreamVNext()` 恢复中断的流
5. **过滤事件** - 根据需要过滤特定事件类型
6. **管理连接** - 长时间运行的流注意连接管理

---

## 12. 参考资料

- [Mastra 官方文档 - Streaming](https://mastra.ai/docs/streaming/overview)
- [Mastra 官方文档 - Streaming Events](https://mastra.ai/docs/streaming/events)
- [Mastra 官方文档 - Tool Streaming](https://mastra.ai/docs/streaming/tool-streaming)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

