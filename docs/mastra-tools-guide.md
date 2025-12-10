# Mastra Tools（工具）专题指南

## 1. 什么是 Tools？

Tools（工具）让智能体能够调用 API、查询数据库或运行代码库中的自定义函数。工具通过提供对数据的结构化访问和执行明确定义的操作，扩展了智能体的能力。

### 核心能力
- 🔌 **API 调用** - 与外部服务交互
- 🗄️ **数据库查询** - 检索和存储数据
- ⚙️ **自定义逻辑** - 执行业务逻辑
- 📊 **类型安全** - 使用 Zod Schema 定义输入输出

---

## 2. 工具组成部分

| 部分 | 描述 | 必需 |
|------|------|------|
| `id` | 工具唯一标识符 | ✅ |
| `description` | 帮助智能体理解何时使用该工具 | ✅ |
| `inputSchema` | 定义工具需要的输入数据结构 | ✅ |
| `outputSchema` | 定义工具返回的数据结构 | ✅ |
| `execute` | 执行工具操作的函数 | ✅ |

---

## 3. 创建工具

### 3.1 基本工具

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const weatherTool = createTool({
  id: "weather-tool",
  description: "获取指定位置的天气信息",
  inputSchema: z.object({
    location: z.string().describe("城市名称"),
  }),
  outputSchema: z.object({
    weather: z.string(),
  }),
  execute: async ({ context }) => {
    const { location } = context;
    const response = await fetch(`https://wttr.in/${location}?format=3`);
    const weather = await response.text();
    return { weather };
  },
});
```

### 3.2 带复杂 Schema 的工具

```typescript
export const searchTool = createTool({
  id: "search-tool",
  description: "搜索文档并返回相关结果",
  inputSchema: z.object({
    query: z.string().describe("搜索查询"),
    limit: z.number().optional().default(10).describe("返回结果数量"),
    filters: z.object({
      category: z.string().optional(),
      dateRange: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }).optional(),
    }).optional(),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      title: z.string(),
      snippet: z.string(),
      url: z.string(),
      score: z.number(),
    })),
    totalCount: z.number(),
  }),
  execute: async ({ context }) => {
    const { query, limit, filters } = context;
    // 执行搜索逻辑
    return { results: [], totalCount: 0 };
  },
});
```

---

## 4. 将工具添加到智能体

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { weatherTool } from "../tools/weather-tool";
import { searchTool } from "../tools/search-tool";

export const assistantAgent = new Agent({
  name: "assistant-agent",
  instructions: `
    你是一个有帮助的助手。
    使用 weatherTool 获取天气信息。
    使用 searchTool 搜索相关文档。
  `,
  model: openai("gpt-4o-mini"),
  tools: { weatherTool, searchTool },
});
```

---

## 5. Execute 函数参数

### 5.1 context

包含工具的输入数据：

```typescript
execute: async ({ context }) => {
  const { location } = context; // 从 inputSchema 推断类型
  // ...
}
```

### 5.2 mastra

访问 Mastra 实例：

```typescript
execute: async ({ context, mastra }) => {
  const agent = mastra?.getAgent("testAgent");
  const response = await agent?.generate("...");
  // ...
}
```

### 5.3 runtimeContext

访问运行时上下文：

```typescript
execute: async ({ context, runtimeContext }) => {
  const userTier = runtimeContext.get("user-tier");
  // 根据用户等级返回不同结果
  // ...
}
```

### 5.4 abortSignal

处理取消请求：

```typescript
execute: async ({ context }, { abortSignal }) => {
  const response = await fetch(url, {
    signal: abortSignal,
  });
  
  if (abortSignal?.aborted) {
    throw new Error("已取消");
  }
  
  return { data: await response.json() };
}
```

### 5.5 writer（流式输出）

向流中写入自定义事件：

```typescript
execute: async ({ context, writer }) => {
  await writer?.write({
    type: "progress",
    status: "pending",
  });
  
  const response = await fetch(...);
  
  await writer?.write({
    type: "progress",
    status: "success",
  });
  
  return { value: response };
}
```

---

## 6. 在工作流步骤中使用工具

### 6.1 直接调用

```typescript
import { createStep } from "@mastra/core/workflows";
import { testTool } from "../tools/test-tool";

const step2 = createStep({
  id: "step-2",
  inputSchema: z.object({ formatted: z.string() }),
  outputSchema: z.object({ emphasized: z.string() }),
  execute: async ({ inputData, runtimeContext }) => {
    const { formatted } = inputData;

    const response = await testTool.execute({
      context: { text: formatted },
      runtimeContext,
    });

    return { emphasized: response.emphasized };
  },
});
```

### 6.2 作为步骤使用

```typescript
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { testTool } from "../tools/test-tool";

const toolStep = createStep(testTool);

export const workflow = createWorkflow({...})
  .then(step1)
  .map(async ({ inputData }) => ({
    text: inputData.formatted,
  }))
  .then(toolStep)
  .commit();
```

---

## 7. AI SDK 工具格式兼容

Mastra 兼容 Vercel AI SDK 的工具格式：

```typescript
import { tool } from "ai";
import { z } from "zod";

export const vercelWeatherTool = tool({
  description: "获取指定位置的天气信息",
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    const response = await fetch(`https://wttr.in/${location}?format=3`);
    return { weather: await response.text() };
  },
});

// 可以与 Mastra 工具混合使用
export const agent = new Agent({
  // ...
  tools: { weatherTool, vercelWeatherTool },
});
```

---

## 8. 工具流式输出

### 8.1 使用 writer

```typescript
export const progressTool = createTool({
  id: "progress-tool",
  description: "执行长时间任务并报告进度",
  inputSchema: z.object({ taskId: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ context, writer }) => {
    const { taskId } = context;

    // 报告进度
    await writer?.write({ type: "progress", percent: 0 });
    
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

### 8.2 检查流事件

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

---

## 9. 工具中使用智能体

```typescript
export const analysisToolWithAgent = createTool({
  id: "analysis-tool",
  description: "使用 AI 分析数据",
  inputSchema: z.object({
    data: z.string(),
  }),
  outputSchema: z.object({
    analysis: z.string(),
  }),
  execute: async ({ context, mastra, writer }) => {
    const { data } = context;

    const agent = mastra?.getAgent("analysisAgent");
    const stream = await agent?.stream(`分析以下数据: ${data}`);

    // 将智能体的输出流式传输到工具的 writer
    await stream!.textStream.pipeTo(writer!);

    return { analysis: await stream!.text };
  },
});
```

---

## 10. 最佳实践

### 10.1 描述清晰

```typescript
// ✅ 好的描述
description: "获取指定城市的当前天气信息，包括温度、湿度和天气状况"

// ❌ 不好的描述
description: "天气工具"
```

### 10.2 Schema 描述

```typescript
inputSchema: z.object({
  location: z.string().describe("城市名称，如 '北京' 或 'New York'"),
  units: z.enum(["metric", "imperial"]).describe("温度单位：metric (摄氏度) 或 imperial (华氏度)"),
})
```

### 10.3 错误处理

```typescript
execute: async ({ context }) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { 
        error: `请求失败: ${response.status}`,
        data: null 
      };
    }
    return { error: null, data: await response.json() };
  } catch (error) {
    return { 
      error: `网络错误: ${error.message}`,
      data: null 
    };
  }
}
```

### 10.4 保持工具专注

```typescript
// ✅ 好的：单一职责
const getCurrentWeather = createTool({...});
const getWeatherForecast = createTool({...});

// ❌ 不好的：功能过多
const weatherSuperTool = createTool({
  // 同时处理当前天气、预报、历史数据等
});
```

---

## 11. 参考资料

- [Mastra 官方文档 - Using Tools](https://mastra.ai/docs/agents/using-tools)
- [Mastra 官方文档 - Tool Reference](https://mastra.ai/reference/tools)
- [Zod 文档](https://zod.dev/)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

