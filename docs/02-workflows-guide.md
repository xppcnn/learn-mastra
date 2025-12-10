# Mastra Workflows（工作流）专题指南

## 1. 什么是 Workflows？

Workflows（工作流）让你定义复杂的任务序列，使用清晰、结构化的步骤，而不是依赖单个智能体的推理。

### 核心能力
- 📋 **任务分解** - 将复杂任务拆分为可管理的步骤
- 🔀 **控制流** - 支持顺序、并行、条件分支等执行模式
- ⏸️ **暂停与恢复** - 支持 Human-in-the-Loop 场景
- 🔄 **Time Travel** - 从任意步骤重新执行
- 📊 **类型安全** - 使用 Zod schema 确保数据流正确

---

## 2. Workflows 的工作原理

```
1. 定义工作流的 inputSchema 和 outputSchema
        ↓
2. 创建步骤（Steps）
        ↓
3. 使用控制流方法组合步骤
        ↓
4. 调用 .commit() 完成定义
        ↓
5. 创建运行实例并执行
        ↓
6. 获取结果或处理暂停状态
```

**核心原则**：
- 第一个步骤的 `inputSchema` 必须匹配工作流的 `inputSchema`
- 最后一个步骤的 `outputSchema` 必须匹配工作流的 `outputSchema`
- 每个步骤的 `outputSchema` 必须匹配下一个步骤的 `inputSchema`

---

## 3. 创建工作流步骤

### 基本步骤

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

### 步骤配置参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | ✅ | 步骤唯一标识符 |
| `inputSchema` | ZodSchema | ✅ | 输入数据结构 |
| `outputSchema` | ZodSchema | ✅ | 输出数据结构 |
| `execute` | function | ✅ | 执行函数 |
| `description` | string | ❌ | 步骤描述 |
| `resumeSchema` | ZodSchema | ❌ | 恢复数据结构 |
| `suspendSchema` | ZodSchema | ❌ | 暂停数据结构 |
| `stateSchema` | ZodSchema | ❌ | 共享状态结构 |
| `retries` | number | ❌ | 重试次数 |

### Execute 函数参数

```typescript
execute: async ({
  inputData,      // 步骤输入数据
  resumeData,     // 恢复时的数据
  state,          // 共享状态
  setState,       // 更新状态
  suspend,        // 暂停函数
  bail,           // 终止函数
  abort,          // 取消函数
  mastra,         // Mastra 实例
  runtimeContext, // 运行时上下文
  getStepResult,  // 获取其他步骤结果
  getInitData,    // 获取初始输入
}) => {
  // 执行逻辑
  return { /* 输出数据 */ };
}
```

---

## 4. 创建工作流

### 基本工作流

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
    result: z.string(),
  }),
})
  .then(step1)
  .then(step2)
  .commit();
```

### 工作流配置参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | ✅ | 工作流唯一标识符 |
| `inputSchema` | ZodSchema | ✅ | 输入数据结构 |
| `outputSchema` | ZodSchema | ✅ | 输出数据结构 |
| `description` | string | ❌ | 工作流描述 |
| `stateSchema` | ZodSchema | ❌ | 共享状态结构 |
| `retryConfig` | object | ❌ | 重试配置 |

---

## 5. 控制流方法

### 5.1 顺序执行 `.then()`

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .then(step2)
  .then(step3)
  .commit();
```

### 5.2 并行执行 `.parallel()`

```typescript
const step3 = createStep({
  id: "step-3",
  inputSchema: z.object({
    "step-1": z.object({ formatted: z.string() }),
    "step-2": z.object({ emphasized: z.string() }),
  }),
  outputSchema: z.object({ combined: z.string() }),
  execute: async ({ inputData }) => {
    const formatted = inputData["step-1"].formatted;
    const emphasized = inputData["step-2"].emphasized;
    return { combined: `${formatted} | ${emphasized}` };
  },
});

export const workflow = createWorkflow({...})
  .parallel([step1, step2])
  .then(step3)
  .commit();
```

### 5.3 条件分支 `.branch()`

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .branch([
    [async ({ inputData: { value } }) => value > 10, stepA],
    [async ({ inputData: { value } }) => value <= 10, stepB],
  ])
  .commit();
```

### 5.4 循环直到 `.dountil()`

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .dountil(
    incrementStep,
    async ({ inputData: { number } }) => number > 10
  )
  .commit();
```

### 5.5 循环当 `.dowhile()`

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .dowhile(
    incrementStep,
    async ({ inputData: { number } }) => number < 10
  )
  .commit();
```

### 5.6 遍历数组 `.foreach()`

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
  .foreach(processItem, { concurrency: 4 })
  .commit();
```

### 5.7 数据映射 `.map()`

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

### 5.8 延迟执行

```typescript
export const workflow = createWorkflow({...})
  .then(step1)
  .sleep(5000)  // 暂停 5 秒
  .then(step2)
  .sleepUntil(new Date("2025-01-01"))  // 暂停直到指定日期
  .then(step3)
  .commit();
```

---

## 6. Suspend & Resume（暂停与恢复）

### 6.1 暂停工作流

```typescript
const approvalStep = createStep({
  id: "approval-step",
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

    return { output: `已发送邮件给 ${inputData.userEmail}` };
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
    step: "approval-step",
    resumeData: { approved: true },
  });
}
```

---

## 7. Workflow State（工作流状态）

### 共享状态

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

## 8. 运行工作流

### 8.1 Start 模式

```typescript
const workflow = mastra.getWorkflow("testWorkflow");
const run = await workflow.createRunAsync();

const result = await run.start({
  inputData: { message: "Hello world" },
});

console.log(result.status);  // "success" | "suspended" | "failed"
console.log(result.result);  // 最终输出
```

### 8.2 Stream 模式

```typescript
const run = await workflow.createRunAsync();

const stream = await run.stream({
  inputData: { message: "Hello world" },
});

for await (const chunk of stream) {
  console.log(chunk.type);  // 事件类型
  console.log(chunk.payload);  // 事件数据
}
```

### 工作流状态类型

| 状态 | 描述 |
|------|------|
| `running` | 正在执行 |
| `suspended` | 已暂停，等待恢复 |
| `success` | 成功完成 |
| `failed` | 执行失败 |

---

## 9. 错误处理

### 9.1 工作流级别重试

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

### 9.2 步骤级别重试

```typescript
const step1 = createStep({
  id: "step-1",
  retries: 3,
  execute: async ({ inputData }) => {
    // 执行逻辑
  },
});
```

### 9.3 使用 bail() 提前退出

```typescript
const step1 = createStep({
  execute: async ({ bail }) => {
    if (someCondition) {
      return bail({ result: "提前退出" });
    }
    return { value: "正常结果" };
  },
});
```

---

## 10. 嵌套工作流

### 工作流作为步骤

```typescript
const childWorkflow = createWorkflow({
  id: "child-workflow",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ result: z.string() }),
})
  .then(step1)
  .then(step2)
  .commit();

export const parentWorkflow = createWorkflow({
  id: "parent-workflow",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ result: z.string() }),
})
  .then(childWorkflow)  // 将子工作流作为步骤
  .commit();
```

### 克隆工作流

```typescript
import { cloneWorkflow } from "@mastra/core/workflows";

const clonedWorkflow = cloneWorkflow(originalWorkflow, {
  id: "cloned-workflow",
});
```

---

## 11. API 参考

### 工作流方法

| 方法 | 描述 |
|------|------|
| `.then(step)` | 顺序执行 |
| `.parallel([steps])` | 并行执行 |
| `.branch([conditions])` | 条件分支 |
| `.dountil(step, condition)` | 循环直到 |
| `.dowhile(step, condition)` | 循环当 |
| `.foreach(step, options)` | 遍历数组 |
| `.map(fn)` | 数据映射 |
| `.sleep(ms)` | 延迟毫秒 |
| `.sleepUntil(date)` | 延迟到日期 |
| `.waitForEvent(event, step)` | 等待事件 |
| `.commit()` | 完成定义 |

### Run 方法

| 方法 | 描述 |
|------|------|
| `run.start(options)` | 启动执行 |
| `run.stream(options)` | 流式执行 |
| `run.resume(options)` | 恢复执行 |
| `run.watch(callback)` | 监听事件 |

---

## 12. 最佳实践

1. **保持步骤单一职责** - 每个步骤只做一件事
2. **定义完整的 Schema** - 确保类型安全和数据验证
3. **使用有意义的 ID** - 方便调试和日志追踪
4. **处理错误情况** - 配置重试和 bail 逻辑
5. **合理使用并行** - 对独立任务使用 parallel
6. **配置持久化存储** - 支持 suspend/resume 功能

---

## 13. 参考资料

- [Mastra 官方文档 - Workflows](https://mastra.ai/docs/workflows/overview)
- [Mastra 官方文档 - Control Flow](https://mastra.ai/docs/workflows/control-flow)
- [Mastra 官方文档 - Suspend & Resume](https://mastra.ai/docs/workflows/suspend-and-resume)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

