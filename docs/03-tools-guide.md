# Mastra Tools（工具）专题指南

## 1. 什么是 Tools？

Tools（工具）让智能体能够调用 API、查询数据库或运行代码库中的自定义函数。工具通过提供对数据的**结构化访问**和执行**明确定义的操作**，扩展了智能体的能力。

### 核心能力
- 🔌 **API 调用** - 连接外部服务和 API
- 🗄️ **数据库查询** - 查询和操作数据
- ⚙️ **自定义逻辑** - 执行任意代码
- 📊 **结构化输入输出** - 类型安全的数据交换

---

## 2. Tools 的工作原理

```
1. 定义工具（inputSchema, outputSchema, execute）
        ↓
2. 将工具添加到智能体
        ↓
3. 智能体接收用户请求
        ↓
4. LLM 决定是否需要调用工具
        ↓
5. 智能体使用推断的参数调用工具
        ↓
6. 工具返回结果
        ↓
7. 智能体基于结果生成响应
```

**关键点**：智能体使用工具的 `description` 和 `inputSchema` 来决定何时以及如何使用工具。

---

## 3. 创建工具

### 基本工具

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const weatherTool = createTool({
  id: "weather-tool",
  description: "获取指定位置的当前天气信息",
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

### 工具配置参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | ✅ | 工具唯一标识符 |
| `description` | string | ✅ | 工具描述（帮助 LLM 理解用途） |
| `inputSchema` | ZodSchema | ✅ | 输入数据结构 |
| `outputSchema` | ZodSchema | ✅ | 输出数据结构 |
| `execute` | function | ✅ | 执行函数 |

### Execute 函数参数

```typescript
execute: async ({
  context,        // 输入数据（来自 inputSchema）
  mastra,         // Mastra 实例
  runtimeContext, // 运行时上下文
}) => {
  // 执行逻辑
  return { /* 输出数据 */ };
}
```

---

## 4. 工具示例

### 4.1 天气工具

```typescript
export const weatherTool = createTool({
  id: "weather-tool",
  description: "获取指定城市的当前天气",
  inputSchema: z.object({
    city: z.string().describe("城市名称，如：北京、上海"),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    condition: z.string(),
    humidity: z.number(),
  }),
  execute: async ({ context }) => {
    const { city } = context;
    
    // 调用天气 API
    const response = await fetch(
      `https://api.weather.com/v1/current?city=${encodeURIComponent(city)}`
    );
    const data = await response.json();
    
    return {
      temperature: data.temp,
      condition: data.condition,
      humidity: data.humidity,
    };
  },
});
```

### 4.2 数据库查询工具

```typescript
export const searchUsersTool = createTool({
  id: "search-users",
  description: "根据条件搜索用户",
  inputSchema: z.object({
    name: z.string().optional().describe("用户名（模糊匹配）"),
    email: z.string().optional().describe("邮箱地址"),
    limit: z.number().default(10).describe("返回结果数量限制"),
  }),
  outputSchema: z.object({
    users: z.array(z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })),
    total: z.number(),
  }),
  execute: async ({ context }) => {
    const { name, email, limit } = context;
    
    // 数据库查询逻辑
    const users = await db.users.findMany({
      where: {
        name: name ? { contains: name } : undefined,
        email: email ? { equals: email } : undefined,
      },
      take: limit,
    });
    
    return {
      users,
      total: users.length,
    };
  },
});
```

### 4.3 计算工具

```typescript
export const calculatorTool = createTool({
  id: "calculator",
  description: "执行基本数学计算",
  inputSchema: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  outputSchema: z.object({
    result: z.number(),
  }),
  execute: async ({ context }) => {
    const { operation, a, b } = context;
    
    let result: number;
    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) throw new Error("除数不能为零");
        result = a / b;
        break;
    }
    
    return { result };
  },
});
```

---

## 5. 将工具添加到智能体

### 添加单个工具

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { weatherTool } from "../tools/weather-tool";

export const weatherAgent = new Agent({
  name: "weather-agent",
  instructions: `
    你是一个天气助手。
    当用户询问天气时，使用 weatherTool 获取数据。
    提供简洁、有用的天气信息。
  `,
  model: openai("gpt-4o-mini"),
  tools: { weatherTool },
});
```

### 添加多个工具

```typescript
import { weatherTool } from "../tools/weather-tool";
import { calculatorTool } from "../tools/calculator-tool";
import { searchUsersTool } from "../tools/search-users-tool";

export const multiToolAgent = new Agent({
  name: "multi-tool-agent",
  instructions: `
    你是一个多功能助手，可以：
    - 查询天气（使用 weatherTool）
    - 执行计算（使用 calculatorTool）
    - 搜索用户（使用 searchUsersTool）
  `,
  model: openai("gpt-4o-mini"),
  tools: { weatherTool, calculatorTool, searchUsersTool },
});
```

---

## 6. 高级功能

### 6.1 使用 RuntimeContext

根据请求上下文动态调整工具行为：

```typescript
export const dynamicTool = createTool({
  id: "dynamic-tool",
  description: "根据用户等级提供不同功能",
  inputSchema: z.object({
    query: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ context, runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier");
    
    if (userTier === "enterprise") {
      // 企业用户获得高级功能
      return { result: "高级结果" };
    }
    
    return { result: "基础结果" };
  },
});
```

### 6.2 使用 AbortSignal 取消执行

```typescript
export const longRunningTool = createTool({
  id: "long-running-tool",
  description: "执行耗时操作",
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ context }, { abortSignal }) => {
    const response = await fetch("https://api.example.com/process", {
      method: "POST",
      body: JSON.stringify(context),
      signal: abortSignal,  // 传递 abort signal
    });

    if (abortSignal?.aborted) {
      throw new Error("操作已取消");
    }

    return { result: await response.text() };
  },
});
```

### 6.3 访问 Mastra 实例

在工具中访问其他智能体或资源：

```typescript
export const agentCallerTool = createTool({
  id: "agent-caller",
  description: "调用其他智能体",
  inputSchema: z.object({
    prompt: z.string(),
  }),
  outputSchema: z.object({
    response: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const otherAgent = mastra?.getAgent("otherAgent");
    const result = await otherAgent?.generate(context.prompt);
    
    return { response: result?.text ?? "" };
  },
});
```

### 6.4 工具流式输出

```typescript
export const streamingTool = createTool({
  id: "streaming-tool",
  description: "支持流式输出的工具",
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ context, writer }) => {
    // 发送进度更新
    await writer?.write({
      type: "progress",
      status: "processing",
    });

    const result = await processQuery(context.query);

    await writer?.write({
      type: "progress",
      status: "complete",
    });

    return { result };
  },
});
```

---

## 7. 在工作流中使用工具

### 作为步骤调用

```typescript
import { createStep } from "@mastra/core/workflows";
import { weatherTool } from "../tools/weather-tool";

const weatherStep = createStep({
  id: "weather-step",
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({ weather: z.string() }),
  execute: async ({ inputData, runtimeContext }) => {
    const response = await weatherTool.execute({
      context: { location: inputData.city },
      runtimeContext,
    });
    
    return { weather: response.weather };
  },
});
```

### 工具作为步骤

```typescript
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { weatherTool } from "../tools/weather-tool";

const toolStep = createStep(weatherTool);

export const workflow = createWorkflow({...})
  .map(async ({ inputData }) => ({
    location: inputData.city,  // 映射到工具的 inputSchema
  }))
  .then(toolStep)
  .commit();
```

---

## 8. AI SDK 工具格式兼容

Mastra 兼容 Vercel AI SDK 的工具格式：

```typescript
import { tool } from "ai";
import { z } from "zod";

// AI SDK 格式的工具
export const vercelWeatherTool = tool({
  description: "获取天气信息",
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    const response = await fetch(`https://wttr.in/${location}?format=3`);
    return { weather: await response.text() };
  },
});

// 可以直接在 Mastra 智能体中使用
export const agent = new Agent({
  name: "agent",
  model: openai("gpt-4o-mini"),
  tools: { vercelWeatherTool },
});
```

---

## 9. API 参考

### createTool 参数

| 参数 | 类型 | 描述 |
|------|------|------|
| `id` | string | 工具唯一标识符 |
| `description` | string | 工具描述 |
| `inputSchema` | ZodSchema | 输入数据结构 |
| `outputSchema` | ZodSchema | 输出数据结构 |
| `execute` | function | 执行函数 |

### Execute 上下文

| 参数 | 描述 |
|------|------|
| `context` | 输入数据（匹配 inputSchema） |
| `mastra` | Mastra 实例 |
| `runtimeContext` | 运行时上下文 |

### Execute 选项（第二参数）

| 参数 | 描述 |
|------|------|
| `abortSignal` | 取消信号 |
| `writer` | 流式输出写入器 |

---

## 10. 最佳实践

1. **编写清晰的描述** - 帮助 LLM 理解何时使用工具
2. **使用描述性的 Schema 字段** - 使用 `.describe()` 说明每个字段
3. **处理错误情况** - 在 execute 中捕获和处理异常
4. **保持工具单一职责** - 每个工具只做一件事
5. **使用 AbortSignal** - 支持长时间运行操作的取消
6. **验证输入数据** - 依赖 Zod schema 进行验证

---

## 11. 参考资料

- [Mastra 官方文档 - Using Tools](https://mastra.ai/docs/agents/using-tools)
- [Mastra 官方文档 - Agents and Tools](https://mastra.ai/docs/workflows/agents-and-tools)
- [Vercel AI SDK - Tools](https://sdk.vercel.ai/docs/ai-sdk-core/tools)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

