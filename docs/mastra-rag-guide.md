# Mastra RAG（检索增强生成）专题指南

## 1. 什么是 RAG？

RAG（Retrieval-Augmented Generation，检索增强生成）通过从数据源检索相关上下文来增强 LLM 输出，提高准确性并将响应建立在真实信息之上。

### 核心能力
- 📄 **文档处理** - 支持多种文档格式
- ✂️ **智能分块** - 多种分块策略
- 🔢 **嵌入生成** - 将文本转换为向量
- 🗄️ **向量存储** - 支持多种向量数据库
- 🔍 **相似性搜索** - 基于语义检索相关内容

---

## 2. RAG 工作流程

```
1. 文档处理（Document Processing）
        ↓
2. 分块（Chunking）
        ↓
3. 生成嵌入（Embedding Generation）
        ↓
4. 存储到向量数据库（Vector Storage）
        ↓
5. 查询时检索相关内容（Retrieval）
        ↓
6. 将上下文与查询一起发送给 LLM
```

---

## 3. 文档处理

### 3.1 创建文档

```typescript
import { MDocument } from "@mastra/rag";

// 从纯文本创建
const docFromText = MDocument.fromText("你的纯文本内容...");

// 从 HTML 创建
const docFromHTML = MDocument.fromHTML("<html>你的 HTML 内容</html>");

// 从 Markdown 创建
const docFromMarkdown = MDocument.fromMarkdown("# 你的 Markdown 内容");

// 从 JSON 创建
const docFromJSON = MDocument.fromJSON(`{ "key": "value" }`);
```

---

## 4. 分块策略

### 4.1 可用策略

| 策略 | 描述 | 适用场景 |
|------|------|----------|
| `recursive` | 基于内容结构的智能分割 | 通用文本 |
| `character` | 简单的字符分割 | 简单文本 |
| `token` | 令牌感知分割 | 需要精确控制 token 数 |
| `markdown` | Markdown 感知分割 | Markdown 文档 |
| `semantic-markdown` | 基于语义的 Markdown 分割 | 需要保留语义关系 |
| `html` | HTML 结构感知分割 | HTML 文档 |
| `json` | JSON 结构感知分割 | JSON 数据 |
| `latex` | LaTeX 结构感知分割 | LaTeX 文档 |
| `sentence` | 句子感知分割 | 需要保留句子完整性 |

### 4.2 Recursive 策略

```typescript
const chunks = await doc.chunk({
  strategy: "recursive",
  maxSize: 512,
  overlap: 50,
  separators: ["\n\n", "\n", " "],
  extract: {
    metadata: true, // 可选：提取元数据
  },
});
```

### 4.3 Sentence 策略

```typescript
const chunks = await doc.chunk({
  strategy: "sentence",
  maxSize: 450,
  minSize: 50,
  overlap: 0,
  sentenceEnders: [".", "!", "?", "。", "！", "？"],
  keepSeparator: true,
});
```

### 4.4 Semantic Markdown 策略

```typescript
const chunks = await doc.chunk({
  strategy: "semantic-markdown",
  joinThreshold: 500,
  modelName: "gpt-3.5-turbo",
});
```

### 4.5 Token 策略

```typescript
const chunks = await doc.chunk({
  strategy: "token",
  maxSize: 256,
  overlap: 20,
});
```

---

## 5. 嵌入生成

### 5.1 使用 Model Router

```typescript
import { ModelRouterEmbeddingModel } from "@mastra/core";
import { embedMany } from "ai";

const embeddingModel = new ModelRouterEmbeddingModel(
  "openai/text-embedding-3-small"
);

const { embeddings } = await embedMany({
  model: embeddingModel,
  values: chunks.map((chunk) => chunk.text),
});
```

### 5.2 使用 AI SDK

```typescript
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";

const { embeddings } = await embedMany({
  model: openai.embedding("text-embedding-3-small"),
  values: chunks.map((chunk) => chunk.text),
});
```

### 5.3 配置嵌入维度

```typescript
// OpenAI (text-embedding-3 系列支持自定义维度)
const { embeddings } = await embedMany({
  model: openai.embedding("text-embedding-3-small", {
    dimensions: 256, // 减少维度以节省存储
  }),
  values: chunks.map((chunk) => chunk.text),
});

// Google
import { google } from "@ai-sdk/google";

const { embeddings } = await embedMany({
  model: google.textEmbeddingModel("text-embedding-004", {
    outputDimensionality: 256,
  }),
  values: chunks.map((chunk) => chunk.text),
});
```

### 5.4 支持的嵌入模型

| 提供商 | 模型 | 默认维度 |
|--------|------|----------|
| OpenAI | text-embedding-3-small | 1536 |
| OpenAI | text-embedding-3-large | 3072 |
| OpenAI | text-embedding-ada-002 | 1536 |
| Google | text-embedding-004 | 768 |
| Google | gemini-embedding-001 | 768 |
| Cohere | embed-multilingual-v3 | 1024 |

---

## 6. 向量存储

### 6.1 支持的向量数据库

| 数据库 | 包名 |
|--------|------|
| PostgreSQL (pgvector) | `@mastra/pg` |
| Pinecone | `@mastra/pinecone` |
| Qdrant | `@mastra/qdrant` |
| Chroma | `@mastra/chroma` |
| MongoDB | `@mastra/mongodb` |
| LibSQL | `@mastra/libsql` |
| Upstash | `@mastra/upstash` |
| Cloudflare Vectorize | `@mastra/vectorize` |
| OpenSearch | `@mastra/opensearch` |
| LanceDB | `@mastra/lance` |

### 6.2 创建索引

```typescript
import { PgVector } from "@mastra/pg";

const store = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

// 创建索引（维度必须与嵌入模型匹配）
await store.createIndex({
  indexName: "my-embeddings",
  dimension: 1536, // text-embedding-3-small 的维度
});
```

### 6.3 存储嵌入

```typescript
await store.upsert({
  indexName: "my-embeddings",
  vectors: embeddings,
  metadata: chunks.map((chunk) => ({
    text: chunk.text,
    source: chunk.source,
    category: chunk.category,
    createdAt: new Date().toISOString(),
  })),
});
```

### 6.4 各数据库配置示例

```typescript
// PostgreSQL
import { PgVector } from "@mastra/pg";
const pgStore = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

// Pinecone
import { PineconeVector } from "@mastra/pinecone";
const pineconeStore = new PineconeVector({
  apiKey: process.env.PINECONE_API_KEY,
});

// Qdrant
import { QdrantVector } from "@mastra/qdrant";
const qdrantStore = new QdrantVector({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// Chroma
import { ChromaVector } from "@mastra/chroma";
const chromaStore = new ChromaVector({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE,
});

// LibSQL
import { LibSQLVector } from "@mastra/libsql";
const libsqlStore = new LibSQLVector({
  connectionUrl: process.env.DATABASE_URL,
});
```

---

## 7. 检索

### 7.1 基本语义搜索

```typescript
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

// 将查询转换为嵌入
const { embedding } = await embed({
  value: "文章的主要观点是什么？",
  model: openai.embedding("text-embedding-3-small"),
});

// 查询向量数据库
const results = await store.query({
  indexName: "my-embeddings",
  queryVector: embedding,
  topK: 10,
});

console.log(results);
// [
//   { text: "...", score: 0.89, metadata: { source: "..." } },
//   { text: "...", score: 0.82, metadata: { source: "..." } },
// ]
```

### 7.2 元数据过滤

```typescript
// 简单过滤
const results = await store.query({
  indexName: "my-embeddings",
  queryVector: embedding,
  topK: 10,
  filter: {
    source: "article1.txt",
  },
});

// 数值比较
const results = await store.query({
  indexName: "my-embeddings",
  queryVector: embedding,
  topK: 10,
  filter: {
    price: { $gt: 100 },
  },
});

// 多条件
const results = await store.query({
  indexName: "my-embeddings",
  queryVector: embedding,
  topK: 10,
  filter: {
    category: "技术",
    price: { $lt: 1000 },
    inStock: true,
  },
});

// 数组操作
const results = await store.query({
  indexName: "my-embeddings",
  queryVector: embedding,
  topK: 10,
  filter: {
    tags: { $in: ["sale", "new"] },
  },
});

// 逻辑运算符
const results = await store.query({
  indexName: "my-embeddings",
  queryVector: embedding,
  topK: 10,
  filter: {
    $or: [{ category: "电子" }, { category: "配件" }],
    $and: [{ price: { $gt: 50 } }, { price: { $lt: 200 } }],
  },
});
```

### 7.3 Re-ranking（重排序）

```typescript
import { rerankWithScorer as rerank, MastraAgentRelevanceScorer } from "@mastra/rag";

// 获取初始结果
const initialResults = await store.query({
  indexName: "my-embeddings",
  queryVector: embedding,
  topK: 10,
});

// 创建相关性评分器
const relevanceProvider = new MastraAgentRelevanceScorer(
  "relevance-scorer",
  openai("gpt-4o-mini")
);

// 重排序结果
const rerankedResults = await rerank({
  results: initialResults,
  query: "文章的主要观点是什么？",
  provider: relevanceProvider,
  options: { topK: 5 },
});
```

---

## 8. Vector Query Tool

### 8.1 创建工具

```typescript
import { createVectorQueryTool } from "@mastra/rag";

const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: "pgVector",
  indexName: "my-embeddings",
  model: openai.embedding("text-embedding-3-small"),
});
```

### 8.2 在智能体中使用

```typescript
import { Agent } from "@mastra/core/agent";
import { PGVECTOR_PROMPT } from "@mastra/pg";

export const ragAgent = new Agent({
  name: "RAG Agent",
  model: openai("gpt-4o-mini"),
  instructions: `
    使用提供的上下文处理查询。结构化响应以简洁和相关。
    ${PGVECTOR_PROMPT}
  `,
  tools: { vectorQueryTool },
});
```

---

## 9. 完整示例

```typescript
import { embedMany, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { PgVector } from "@mastra/pg";
import { MDocument } from "@mastra/rag";

// 1. 初始化文档
const doc = MDocument.fromText(`
  气候变化对全球农业构成重大挑战。
  温度上升和降水模式变化影响作物产量。
  农民需要采用新的适应策略。
`);

// 2. 创建分块
const chunks = await doc.chunk({
  strategy: "recursive",
  maxSize: 256,
  overlap: 50,
});

// 3. 生成嵌入
const { embeddings } = await embedMany({
  model: openai.embedding("text-embedding-3-small"),
  values: chunks.map((chunk) => chunk.text),
});

// 4. 存储到向量数据库
const store = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

await store.createIndex({
  indexName: "climate-docs",
  dimension: 1536,
});

await store.upsert({
  indexName: "climate-docs",
  vectors: embeddings,
  metadata: chunks.map((chunk) => ({ text: chunk.text })),
});

// 5. 查询
const { embedding: queryEmbedding } = await embed({
  value: "气候变化如何影响农业？",
  model: openai.embedding("text-embedding-3-small"),
});

const results = await store.query({
  indexName: "climate-docs",
  queryVector: queryEmbedding,
  topK: 3,
});

console.log("相关内容:", results);
```

---

## 10. 最佳实践

1. **选择合适的分块策略** - 根据文档类型选择
2. **维度匹配** - 确保索引维度与嵌入模型匹配
3. **元数据设计** - 只存储需要过滤的字段
4. **批量操作** - 使用 `embedMany` 和批量 upsert
5. **添加时间戳** - 方便追踪内容新鲜度
6. **使用重排序** - 对初始结果进行重排序以提高相关性

---

## 11. 参考资料

- [Mastra 官方文档 - RAG](https://mastra.ai/docs/rag/overview)
- [Mastra 官方文档 - Chunking](https://mastra.ai/docs/rag/chunking-and-embedding)
- [Mastra 官方文档 - Vector Databases](https://mastra.ai/docs/rag/vector-databases)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

