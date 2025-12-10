# Mastra Memory（记忆）专题指南

## 1. 什么是 Memory？

Memory（记忆）帮助智能体在交互之间维护上下文。由于 LLM 是无状态的，智能体需要记忆来跟踪对话历史和回忆相关信息。

### 核心能力
- 💬 **对话历史** - 记录最近的消息
- 🧠 **工作记忆** - 存储持久的用户信息
- 🔍 **语义回忆** - 基于语义检索过去的消息
- 🗄️ **持久化存储** - 跨应用重启保存数据

---

## 2. 记忆类型

| 类型 | 描述 | 作用域 |
|------|------|--------|
| **Conversation History** | 当前对话的最近消息 | Thread |
| **Working Memory** | 持久的用户特定信息（姓名、偏好） | Thread 或 Resource |
| **Semantic Recall** | 基于语义相关性检索的历史消息 | Thread 或 Resource |

---

## 3. 快速开始

### 3.1 安装依赖

```bash
npm install @mastra/memory @mastra/libsql
```

### 3.2 基本配置

```typescript
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { openai } from "@ai-sdk/openai";

export const memoryAgent = new Agent({
  name: "memory-agent",
  instructions: "你是一个有帮助的助手。",
  model: openai("gpt-4o-mini"),
  memory: new Memory({
    storage: new LibSQLStore({
      url: ":memory:", // 内存存储（开发用）
      // url: "file:./mastra.db", // 文件存储（生产用）
    }),
  }),
});
```

---

## 4. Conversation History（对话历史）

### 4.1 概念

对话历史是最简单的记忆形式，存储当前对话中的最近消息。默认情况下，每个请求包含最近 10 条消息。

### 4.2 配置

```typescript
const memory = new Memory({
  options: {
    lastMessages: 20, // 增加到 20 条消息
  },
});
```

### 4.3 使用线程

```typescript
// 使用相同的 thread 和 resource 维护对话
const response1 = await agent.generate("我叫张三", {
  memory: {
    thread: "conversation-123",
    resource: "user-456",
  },
});

const response2 = await agent.generate("我叫什么名字？", {
  memory: {
    thread: "conversation-123",
    resource: "user-456",
  },
});
// 智能体会回答 "张三"
```

---

## 5. Working Memory（工作记忆）

### 5.1 概念

工作记忆存储持久的用户特定信息，如姓名、偏好、目标等。这类似于 ChatGPT 中可以让它记住你的信息的功能。

### 5.2 使用模板

```typescript
const memory = new Memory({
  options: {
    workingMemory: {
      enabled: true,
      template: `# 用户档案

## 个人信息
- 姓名:
- 位置:
- 时区:

## 偏好
- 沟通风格:
- 项目目标:
- 关键截止日期:

## 会话状态
- 上次讨论的任务:
- 待解决的问题:
`,
    },
  },
});
```

### 5.3 使用 Zod Schema

```typescript
import { z } from "zod";

const userProfileSchema = z.object({
  name: z.string().optional(),
  location: z.string().optional(),
  preferences: z.object({
    communicationStyle: z.string().optional(),
    goals: z.array(z.string()).optional(),
  }).optional(),
});

const memory = new Memory({
  options: {
    workingMemory: {
      enabled: true,
      schema: userProfileSchema,
    },
  },
});
```

### 5.4 作用域

```typescript
// Thread 作用域（默认）- 记忆隔离在每个对话线程
const memory = new Memory({
  options: {
    workingMemory: {
      enabled: true,
      scope: "thread",
    },
  },
});

// Resource 作用域 - 记忆跨同一用户的所有对话共享
const memory = new Memory({
  options: {
    workingMemory: {
      enabled: true,
      scope: "resource",
    },
  },
});
```

### 5.5 初始化工作记忆

```typescript
// 创建线程时设置初始工作记忆
const thread = await memory.createThread({
  threadId: "thread-123",
  resourceId: "user-456",
  title: "支持会话",
  metadata: {
    workingMemory: `# 用户档案
- 姓名: 张三
- 会员等级: VIP
- 偏好语言: 中文
`,
  },
});
```

---

## 6. Semantic Recall（语义回忆）

### 6.1 概念

语义回忆使用向量嵌入进行相似性搜索，从过去的对话中检索相关消息。当消息不再在最近的对话历史中时，这特别有用。

### 6.2 工作流程

```
1. 新消息生成嵌入
      ↓
2. 在向量数据库中查询相似消息
      ↓
3. 检索语义相关的历史消息
      ↓
4. 与最近对话历史合并
      ↓
5. 发送给 LLM
```

### 6.3 配置

```typescript
const memory = new Memory({
  options: {
    semanticRecall: {
      topK: 3,           // 检索 3 条最相似的消息
      messageRange: 2,    // 包含每个匹配前后 2 条消息
      scope: "resource",  // 跨所有线程搜索（默认）
    },
  },
});
```

### 6.4 存储配置

```typescript
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";

const memory = new Memory({
  storage: new LibSQLStore({
    url: "file:./local.db",
  }),
  vector: new LibSQLVector({
    connectionUrl: "file:./local.db",
  }),
});
```

### 6.5 嵌入模型配置

```typescript
// 使用 Model Router
const memory = new Memory({
  embedder: "openai/text-embedding-3-small",
});

// 使用 AI SDK
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  embedder: openai.embedding("text-embedding-3-small"),
});

// 使用本地嵌入
import { fastembed } from "@mastra/fastembed";

const memory = new Memory({
  embedder: fastembed,
});
```

### 6.6 禁用语义回忆

```typescript
const memory = new Memory({
  options: {
    semanticRecall: false, // 禁用以提高性能
  },
});
```

---

## 7. 线程和资源

### 7.1 概念

Mastra 使用两级作用域系统：

- **Thread（线程）**：代表对话的全局唯一 ID
- **Resource（资源）**：拥有该线程的用户或实体

### 7.2 使用示例

```typescript
// 必须同时提供 thread 和 resource
const response = await agent.generate("你好", {
  memory: {
    thread: "chat-session-123", // 对话 ID
    resource: "user-456",       // 用户 ID
  },
});
```

### 7.3 线程标题生成

```typescript
const memory = new Memory({
  options: {
    threads: {
      generateTitle: true, // 自动生成描述性标题
    },
  },
});

// 自定义标题生成
const memory = new Memory({
  options: {
    threads: {
      generateTitle: {
        model: openai("gpt-4o-mini"),
        instructions: "根据用户的第一条消息生成简洁的标题",
      },
    },
  },
});
```

---

## 8. Memory Processors（记忆处理器）

### 8.1 概念

记忆处理器在消息发送到 LLM 之前修改从记忆中检索的消息列表，用于管理上下文大小和优化性能。

### 8.2 TokenLimiter

```typescript
import { Memory } from "@mastra/memory";
import { TokenLimiter } from "@mastra/memory/processors";

const memory = new Memory({
  processors: [
    new TokenLimiter(127000), // 限制总 token 数
  ],
});
```

### 8.3 ToolCallFilter

```typescript
import { ToolCallFilter, TokenLimiter } from "@mastra/memory/processors";

const memory = new Memory({
  processors: [
    // 移除所有工具调用
    new ToolCallFilter(),
    
    // 或只移除特定工具的调用
    // new ToolCallFilter({ exclude: ["verboseDebugTool"] }),
    
    new TokenLimiter(127000),
  ],
});
```

### 8.4 自定义处理器

```typescript
import { MemoryProcessor } from "@mastra/core/memory";

class ConversationOnlyFilter extends MemoryProcessor {
  constructor() {
    super({ name: "ConversationOnlyFilter" });
  }

  process(messages, opts = {}) {
    return messages.filter(
      (msg) => msg.role === "user" || msg.role === "assistant"
    );
  }
}

const memory = new Memory({
  processors: [
    new ConversationOnlyFilter(),
    new TokenLimiter(127000),
  ],
});
```

---

## 9. 存储提供商

### 9.1 LibSQL

```typescript
import { LibSQLStore } from "@mastra/libsql";

const storage = new LibSQLStore({
  url: ":memory:",           // 内存存储
  // url: "file:./mastra.db", // 文件存储
});
```

### 9.2 PostgreSQL

```typescript
import { PostgresStore } from "@mastra/pg";

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL,
});
```

### 9.3 Upstash

```typescript
import { UpstashStore } from "@mastra/upstash";

const storage = new UpstashStore({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
```

### 9.4 MongoDB

```typescript
import { MongoDBStore } from "@mastra/mongodb";

const storage = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  dbName: process.env.MONGODB_DATABASE,
});
```

---

## 10. 完整配置示例

```typescript
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { TokenLimiter, ToolCallFilter } from "@mastra/memory/processors";
import { openai } from "@ai-sdk/openai";

export const fullMemoryAgent = new Agent({
  name: "full-memory-agent",
  instructions: "你是一个有帮助的助手，能够记住用户的偏好和历史对话。",
  model: openai("gpt-4o"),
  memory: new Memory({
    // 存储配置
    storage: new LibSQLStore({
      url: "file:./mastra.db",
    }),
    // 向量数据库配置
    vector: new LibSQLVector({
      connectionUrl: "file:./mastra.db",
    }),
    // 嵌入模型
    embedder: "openai/text-embedding-3-small",
    // 选项配置
    options: {
      // 对话历史
      lastMessages: 20,
      // 语义回忆
      semanticRecall: {
        topK: 5,
        messageRange: 2,
        scope: "resource",
      },
      // 工作记忆
      workingMemory: {
        enabled: true,
        scope: "resource",
        template: `# 用户档案
- 姓名:
- 偏好:
- 目标:
`,
      },
      // 线程配置
      threads: {
        generateTitle: true,
      },
    },
    // 处理器
    processors: [
      new ToolCallFilter({ exclude: ["verboseDebugTool"] }),
      new TokenLimiter(127000),
    ],
  }),
});
```

---

## 11. 最佳实践

1. **选择合适的存储** - 开发用 `:memory:`，生产用文件或数据库存储
2. **配置 Token 限制** - 使用 TokenLimiter 避免超出上下文窗口
3. **合理使用作用域** - 根据需求选择 thread 或 resource 作用域
4. **设计工作记忆模板** - 使用简短、聚焦的标签
5. **监控性能** - 语义回忆会增加延迟，按需启用/禁用
6. **处理器顺序** - TokenLimiter 应放在最后

---

## 12. 参考资料

- [Mastra 官方文档 - Memory](https://mastra.ai/docs/memory/overview)
- [Mastra 官方文档 - Working Memory](https://mastra.ai/docs/memory/working-memory)
- [Mastra 官方文档 - Semantic Recall](https://mastra.ai/docs/memory/semantic-recall)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

