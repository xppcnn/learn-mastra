# Mastra Time Travel 概念与使用场景指南

## 1. 什么是 Time Travel？

Time Travel 是 Mastra 工作流框架中的一项强大功能，允许开发者从工作流的**特定步骤重新执行**，而无需从头开始运行整个流程。

### 核心能力
- 🔄 **从任意步骤恢复执行** - 使用存储的快照数据或自定义上下文
- 🐛 **调试失败的工作流** - 从失败点开始重新执行
- 🧪 **测试单个步骤** - 使用特定输入测试某一步骤的逻辑
- ⏸️ **从暂停状态恢复** - 处理 Human-in-the-Loop 场景

---

## 2. Time Travel 的工作原理

```
1. 调用 timeTravel() 方法
        ↓
2. 加载存储中的现有快照（如果有）
        ↓
3. 重建目标步骤之前的步骤结果
        ↓
4. 从指定步骤开始执行（使用提供的输入数据）
        ↓
5. 工作流继续执行直至完成
```

**前置条件**：Time Travel 功能依赖于已配置的**存储（Storage）**，因为它需要持久化的工作流快照。

---

## 3. 相关核心概念

### 3.1 Suspend（暂停）

Suspend 是 Time Travel 的基础机制之一。步骤可以调用 `suspend()` 函数暂停执行，等待外部输入。

**定义 Schema：**

```typescript
const step1 = createStep({
  id: "step1",
  inputSchema: z.object({
    userEmail: z.string(),
  }),
  outputSchema: z.object({
    output: z.string(),
  }),
  // 恢复时需要的数据结构
  resumeSchema: z.object({
    approved: z.boolean(),
  }),
  // 暂停时保存的数据结构
  suspendSchema: z.object({
    reason: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend, bail }) => {
    const { approved } = resumeData || {};
    
    if (approved === false) {
      return bail({ reason: "User not approved." });
    }
    
    if (!approved) {
      // 暂停工作流，等待人工审批
      return await suspend({
        reason: "Human approval required.",
      });
    }

    return { output: `Email sent to ${inputData.userEmail}` };
  },
});
```

### 3.2 Resume（恢复）

恢复是 Time Travel 的另一核心功能，允许从暂停的工作流继续执行。

```typescript
// 恢复工作流执行
const result = await run.resume({
  step: "step1",
  resumeData: { approved: true },
});
```

### 3.3 Bail（终止）

当满足某些条件时，可以使用 `bail()` 立即终止工作流并返回结果。

---

## 4. 具体使用场景

### 场景 1：调试失败的工作流

当工作流执行失败时，使用 Time Travel 从失败步骤重新开始，提供修改后的输入数据。

```typescript
const workflow = mastra.getWorkflow("myWorkflow");
const run = await workflow.createRunAsync();

// 首次执行
const failedResult = await run.start({
  inputData: { value: 1 },
});

// 如果失败，从特定步骤恢复
if (failedResult.status === "failed") {
  const recoveredResult = await run.timeTravel({
    step: "step2",
    inputData: { step1Result: 5 },
  });
}
```

### 场景 2：测试单个步骤的逻辑

无需从头执行整个工作流，直接测试某个步骤。

```typescript
const result = await run.timeTravel({
  step: "processData",
  inputData: { testData: "specific test case" },
});
```

### 场景 3：Human-in-the-Loop（人机交互）

处理需要人工审批或输入的工作流。

```typescript
// 启动工作流
const run = await workflow.createRunAsync();
const initialResult = await run.start({
  inputData: { input: "test" },
});

// 检查是否暂停
if (initialResult.status === "suspended") {
  // 获取人工审批结果后恢复
  const result = await run.resume({
    step: "getUserInput",
    resumeData: { userInput: "corrected input" },
  });
}
```

### 场景 4：从错误中恢复（无需重跑整个流程）

```typescript
// 从特定步骤恢复，使用新的输入数据
const result = await run.timeTravel({
  step: "validateData",
  inputData: { correctedData: newData },
});
```

---

## 5. 配置要求

### 5.1 存储配置

Time Travel 需要持久化存储来保存工作流快照：

```typescript
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";

export const mastra = new Mastra({
  workflows: { suspendWorkflow },
  storage: new LibSQLStore({
    // 使用文件存储以持久化快照
    url: "file:../mastra.db",
    // 或使用内存存储（仅用于开发）
    // url: ":memory:",
  }),
});
```

### 5.2 Schema 定义

确保在步骤中定义好相关的 Schema：

| Schema | 用途 |
|--------|------|
| `inputSchema` | 步骤的输入数据结构 |
| `outputSchema` | 步骤的输出数据结构 |
| `resumeSchema` | 恢复执行时需要的数据结构 |
| `suspendSchema` | 暂停时保存的数据结构 |
| `stateSchema` | 跨步骤共享的状态结构 |

---

## 6. API 参考

### 工作流运行方法

| 方法 | 描述 |
|------|------|
| `run.start()` | 启动工作流执行 |
| `run.resume()` | 从暂停状态恢复执行 |
| `run.resumeStream()` | 以流式方式恢复执行 |
| `run.timeTravel()` | 从指定步骤重新执行 |
| `run.watch()` | 监听工作流事件 |

### 步骤内置函数

| 函数 | 描述 |
|------|------|
| `suspend(payload)` | 暂停工作流，保存状态 |
| `bail(result)` | 终止工作流，返回结果 |
| `abort()` | 取消工作流执行 |
| `getStepResult(step)` | 获取之前步骤的结果 |
| `getInitData()` | 获取工作流的初始输入数据 |

---

## 7. 最佳实践

1. **始终配置持久化存储** - Time Travel 依赖快照功能
2. **定义完整的 Schema** - 包括 `resumeSchema` 和 `suspendSchema`
3. **处理 `resumeData` 为空的情况** - 首次执行时 `resumeData` 为 undefined
4. **使用有意义的暂停原因** - 方便调试和日志追踪
5. **考虑幂等性** - 步骤可能被多次执行

---

## 8. 参考资料

- [Mastra 官方文档 - Time Travel](https://mastra.ai/docs/workflows/time-travel)
- [Mastra 官方文档 - Suspend and Resume](https://mastra.ai/docs/workflows/suspend-resume)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

