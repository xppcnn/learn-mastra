# Mastra Workflows（工作流）专题指南

## 1. 什么是 Workflows？

Workflows（工作流）让你定义复杂的任务序列，使用清晰、结构化的步骤，而不是依赖单个智能体的推理。工作流提供对任务分解、数据流动和执行顺序的完全控制。

### 核心能力
- 📋 **明确的执行流程** - 预定义的任务序列
- 🔀 **灵活的控制流** - 支持顺序、并行、分支、循环
- ⏸️ **暂停与恢复** - 等待外部输入或 API 回调
- 📸 **快照持久化** - 保存和恢复执行状态
- 🔄 **时间旅行** - 从任意步骤重新执行

---

## 2. 核心原则

1. 第一个步骤的 `inputSchema` **必须匹配**工作流的 `inputSchema`
2. 最后一个步骤的 `outputSchema` **必须匹配**工作流的 `outputSchema`
3. 每个步骤的 `outputSchema` **必须匹配**下一个步骤的 `inputSchema`
4. 如果不匹配，使用 `.map()` 进行数据转换

---

## 3. 创建工作流步骤

### 3.1 基本步骤

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({
  id: "step-1",
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    formatted: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { message } = inputData;
    return {
      formatted: message.toUpperCase(),
    };
  },
});
```

### 3.2 使用外部资源

```typescript
const fetchDataStep = createStep({
  id: "fetch-data",
  inputSchema: z.object({ url: z.string() }),
  outputSchema: z.object({ data: z.any() }),
  execute: async ({ inputData }) => {
    const response = await fetch(inputData.url);
    const data = await response.json();
    return { data };
  },
});
```

### 3.3 使用智能体

```typescript
const agentStep = createStep({
  id: "agent-step",
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.object({ text: z.string() }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent("testAgent");
    const response = await agent.generate(inputData.prompt);
    return { text: response.text };
  },
});
```

---

## 4. 创建工作流

```typescript
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const step2 = createStep({...});

export const testWorkflow = createWorkflow({
  id: "test-workflow",
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    output: z.string(),
  }),
})
  .then(step1)
  .then(step2)
  .commit();
```

---

## 5. 控制流方法

### 5.1 顺序执行 `.then()`

步骤按顺序依次执行：

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .then(step2)
  .then(step3)
  .commit();
```

### 5.2 并行执行 `.parallel()`

多个步骤同时执行：

```typescript
const step3 = createStep({
  id: "step-3",
  inputSchema: z.object({
    "step-1": z.object({ formatted: z.string() }),
    "step-2": z.object({ emphasized: z.string() }),
  }),
  execute: async ({ inputData }) => {
    const { formatted } = inputData["step-1"];
    const { emphasized } = inputData["step-2"];
    return { combined: `${formatted} | ${emphasized}` };
  },
});

export const workflow = createWorkflow({...})
  .parallel([step1, step2])
  .then(step3)
  .commit();
```

### 5.3 条件分支 `.branch()`

根据条件选择执行路径：

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .branch([
    [async ({ inputData: { value } }) => value > 10, stepA],
    [async ({ inputData: { value } }) => value <= 10, stepB],
  ])
  .commit();
```

### 5.4 循环 `.dountil()` / `.dowhile()`

```typescript
// 循环直到条件为真
export const workflow = createWorkflow({...})
  .then(step1)
  .dountil(step2, async ({ inputData: { number } }) => number > 10)
  .commit();

// 循环当条件为真
export const workflow = createWorkflow({...})
  .then(step1)
  .dowhile(step2, async ({ inputData: { number } }) => number < 10)
  .commit();
```

### 5.5 遍历 `.foreach()`

```typescript
const processItem = createStep({
  id: "process-item",
  inputSchema: z.string(),
  outputSchema: z.string(),
  execute: async ({ inputData }) => inputData.toUpperCase(),
});

export const workflow = createWorkflow({
  inputSchema: z.array(z.string()),
  outputSchema: z.array(z.string()),
})
  .foreach(processItem, { concurrency: 4 }) // 并发处理
  .commit();
```

### 5.6 数据映射 `.map()`

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .map(async ({ inputData }) => {
    const { foo } = inputData;
    return { bar: `new ${foo}` };
  })
  .then(step2)
  .commit();
```

---

## 6. Suspend & Resume（暂停与恢复）

### 6.1 暂停工作流

```typescript
const step1 = createStep({
  id: "step-1",
  inputSchema: z.object({ userEmail: z.string() }),
  outputSchema: z.object({ output: z.string() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({ reason: z.string() }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const { approved } = resumeData ?? {};
    
    if (!approved) {
      return await suspend({
        reason: "需要人工审批",
      });
    }
    
    return { output: `邮件已发送到 ${inputData.userEmail}` };
  },
});
```

### 6.2 恢复工作流

```typescript
const workflow = mastra.getWorkflow("testWorkflow");
const run = await workflow.createRunAsync();

const result = await run.start({
  inputData: { userEmail: "alex@example.com" },
});

if (result.status === "suspended") {
  const resumedResult = await run.resume({
    step: "step-1",
    resumeData: { approved: true },
  });
}
```

### 6.3 使用 Bail 终止

```typescript
execute: async ({ inputData, resumeData, suspend, bail }) => {
  const { approved } = resumeData ?? {};
  
  if (approved === false) {
    return bail({ reason: "用户拒绝了请求" });
  }
  
  if (!approved) {
    return await suspend({ reason: "需要人工审批" });
  }
  
  return { output: "已完成" };
}
```

---

## 7. 工作流状态

### 7.1 使用 stateSchema

```typescript
const step1 = createStep({
  id: "step-1",
  stateSchema: z.object({
    processedItems: z.array(z.string()),
  }),
  execute: async ({ inputData, state, setState }) => {
    setState({
      ...state,
      processedItems: [...state.processedItems, "item-1"],
    });
    return { formatted: inputData.message.toUpperCase() };
  },
});

export const workflow = createWorkflow({
  stateSchema: z.object({
    processedItems: z.array(z.string()),
    metadata: z.object({ processedBy: z.string() }),
  }),
})
  .then(step1)
  .then(step2)
  .commit();
```

---

## 8. 工作流嵌套

### 8.1 作为步骤使用

```typescript
const childWorkflow = createWorkflow({
  id: "child-workflow",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ emphasized: z.string() }),
})
  .then(step1)
  .then(step2)
  .commit();

export const parentWorkflow = createWorkflow({
  id: "parent-workflow",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ emphasized: z.string() }),
})
  .then(childWorkflow)
  .commit();
```

### 8.2 克隆工作流

```typescript
import { cloneWorkflow } from "@mastra/core/workflows";

const clonedWorkflow = cloneWorkflow(parentWorkflow, { 
  id: "cloned-workflow" 
});
```

---

## 9. 运行工作流

### 9.1 使用 start()

```typescript
const workflow = mastra.getWorkflow("testWorkflow");
const run = await workflow.createRunAsync();

const result = await run.start({
  inputData: { message: "Hello world" },
});

console.log(result);
```

### 9.2 使用 stream()

```typescript
const run = await workflow.createRunAsync();

const stream = await run.stream({
  inputData: { message: "Hello world" },
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

### 9.3 工作流状态类型

| 状态 | 描述 |
|------|------|
| `running` | 工作流正在执行 |
| `suspended` | 工作流已暂停，等待恢复 |
| `success` | 工作流成功完成 |
| `failed` | 工作流执行失败 |

---

## 10. 错误处理

### 10.1 工作流级重试

```typescript
export const workflow = createWorkflow({
  id: "test-workflow",
  retryConfig: {
    attempts: 5,
    delay: 2000,
  },
})
  .then(step1)
  .commit();
```

### 10.2 步骤级重试

```typescript
const step1 = createStep({
  id: "step-1",
  retries: 3,
  execute: async ({ inputData }) => {
    const response = await fetch(...);
    if (!response.ok) throw new Error("请求失败");
    return { value: "" };
  },
});
```

### 10.3 条件分支处理错误

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .branch([
    [async ({ inputData: { status } }) => status === "ok", step2],
    [async ({ inputData: { status } }) => status === "error", fallbackStep],
  ])
  .commit();
```

---

## 11. Sleep & Events

### 11.1 Sleep

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .sleep(5000) // 暂停 5 秒
  .then(step2)
  .commit();
```

### 11.2 Sleep Until

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .sleepUntil(new Date("2025-01-01")) // 暂停直到指定日期
  .then(step2)
  .commit();
```

### 11.3 Wait For Event

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .waitForEvent("payment-received", step2, { timeout: 3600000 })
  .commit();

// 发送事件
await run.sendEvent("payment-received", { amount: 100 });
```

---

## 12. 注册工作流

```typescript
import { Mastra } from "@mastra/core/mastra";
import { testWorkflow } from "./workflows/test-workflow";

export const mastra = new Mastra({
  workflows: { testWorkflow },
});

// 获取工作流
const workflow = mastra.getWorkflow("testWorkflow");
```

---

## 13. 最佳实践

1. **Schema 一致性** - 确保步骤之间的 Schema 正确匹配
2. **使用 `.map()`** - 当 Schema 不匹配时进行数据转换
3. **配置存储** - 使用持久化存储以支持 Suspend/Resume
4. **定义 resumeSchema** - 为需要暂停的步骤定义恢复数据结构
5. **错误处理** - 使用重试和条件分支处理失败情况
6. **拆分复杂逻辑** - 将复杂工作流拆分为子工作流

---

## 14. 参考资料

- [Mastra 官方文档 - Workflows](https://mastra.ai/docs/workflows/overview)
- [Mastra 官方文档 - Control Flow](https://mastra.ai/docs/workflows/control-flow)
- [Mastra 官方文档 - Suspend and Resume](https://mastra.ai/docs/workflows/suspend-and-resume)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

