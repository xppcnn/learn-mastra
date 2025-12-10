# Mastra MCP（模型上下文协议）专题指南

## 1. 什么是 MCP？

MCP（Model Context Protocol，模型上下文协议）是连接 AI 智能体到外部工具和资源的开放标准。它作为通用插件系统，使智能体能够调用工具，无论语言或托管环境如何。

### 核心能力
- 🔌 **统一接口** - 标准化的工具访问协议
- 🌐 **跨平台** - 支持本地和远程 MCP 服务器
- 🔧 **双向支持** - 可以作为客户端使用工具，也可以作为服务器提供工具
- 📦 **可发布** - 可以将 MCP 服务器发布到 NPM

---

## 2. 两个核心类

| 类 | 描述 |
|---|------|
| `MCPClient` | 连接到一个或多个 MCP 服务器以访问其工具、资源和提示 |
| `MCPServer` | 将 Mastra 工具、智能体、工作流暴露给 MCP 兼容的客户端 |

---

## 3. MCPClient 配置

### 3.1 基本配置

```typescript
import { MCPClient } from "@mastra/mcp";

export const mcp = new MCPClient({
  id: "my-mcp-client",
  servers: {
    // 本地包（通过 npx 调用）
    wikipedia: {
      command: "npx",
      args: ["-y", "wikipedia-mcp"],
    },
    // 远程 HTTP(S) 端点
    weather: {
      url: new URL("https://weather-mcp-server.example.com/mcp"),
    },
  },
});
```

### 3.2 带认证的配置

```typescript
const mcp = new MCPClient({
  id: "authenticated-mcp-client",
  servers: {
    weather: {
      url: new URL(
        `https://server.smithery.ai/@smithery-ai/national-weather-service/mcp?api_key=${process.env.SMITHERY_API_KEY}`
      ),
    },
    privateApi: {
      url: new URL("https://api.example.com/mcp"),
      requestInit: {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
      },
    },
  },
});
```

---

## 4. 在智能体中使用 MCP 工具

### 4.1 静态工具（推荐用于单用户场景）

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { mcp } from "../mcp/my-mcp-client";

export const mcpAgent = new Agent({
  name: "MCP Agent",
  instructions: `
    你是一个有帮助的助手，可以访问以下 MCP 服务器：
    - Wikipedia MCP 服务器
    - 美国国家气象服务
    
    使用 MCP 服务器找到的信息回答问题。
  `,
  model: openai("gpt-4o-mini"),
  tools: await mcp.getTools(), // 在初始化时获取工具
});
```

### 4.2 动态工具（用于多租户场景）

```typescript
import { MCPClient } from "@mastra/mcp";
import { mastra } from "./mastra";

async function handleRequest(userPrompt: string, userApiKey: string) {
  // 为每个用户创建独立的 MCP 客户端
  const userMcp = new MCPClient({
    servers: {
      weather: {
        url: new URL("http://localhost:8080/mcp"),
        requestInit: {
          headers: {
            Authorization: `Bearer ${userApiKey}`,
          },
        },
      },
    },
  });

  const agent = mastra.getAgent("testAgent");

  const response = await agent.generate(userPrompt, {
    toolsets: await userMcp.getToolsets(), // 在运行时传递工具集
  });

  await userMcp.disconnect();

  return response.text;
}
```

### 4.3 静态 vs 动态工具对比

| 特性 | 静态 (`getTools()`) | 动态 (`getToolsets()`) |
|------|---------------------|------------------------|
| 用例 | 单用户、静态配置 | 多用户、动态配置 |
| 配置 | 在智能体初始化时固定 | 每个请求动态配置 |
| 凭据 | 所有使用共享 | 可以按用户/请求变化 |
| 智能体设置 | 在构造函数中添加工具 | 在 `.generate()` 或 `.stream()` 中传递 |

---

## 5. MCPServer 配置

### 5.1 创建 MCP 服务器

```typescript
import { MCPServer } from "@mastra/mcp";
import { testAgent } from "../agents/test-agent";
import { testWorkflow } from "../workflows/test-workflow";
import { testTool } from "../tools/test-tool";

export const myMcpServer = new MCPServer({
  id: "my-mcp-server",
  name: "My Server",
  version: "1.0.0",
  agents: { testAgent },
  tools: { testTool },
  workflows: { testWorkflow },
});
```

### 5.2 注册 MCP 服务器

```typescript
import { Mastra } from "@mastra/core/mastra";
import { myMcpServer } from "./mcp/my-mcp-server";

export const mastra = new Mastra({
  // ...
  mcpServers: { myMcpServer },
});
```

---

## 6. 连接到 MCP 注册表

### 6.1 Klavis AI

```typescript
import { MCPClient } from "@mastra/mcp";

const mcp = new MCPClient({
  servers: {
    salesforce: {
      url: new URL("https://salesforce-mcp-server.klavis.ai/mcp/?instance_id={private-instance-id}"),
    },
    hubspot: {
      url: new URL("https://hubspot-mcp-server.klavis.ai/mcp/?instance_id={private-instance-id}"),
    },
  },
});
```

### 6.2 mcp.run

```typescript
// 将 SSE URL 存储在环境变量中
// MCP_RUN_SSE_URL=https://www.mcp.run/api/mcp/sse?nonce=...

const mcp = new MCPClient({
  servers: {
    marketing: {
      url: new URL(process.env.MCP_RUN_SSE_URL!),
    },
  },
});
```

### 6.3 Composio.dev

```typescript
const mcp = new MCPClient({
  servers: {
    googleSheets: {
      url: new URL("https://mcp.composio.dev/googlesheets/[private-url-path]"),
    },
    gmail: {
      url: new URL("https://mcp.composio.dev/gmail/[private-url-path]"),
    },
  },
});
```

### 6.4 Smithery.ai

```typescript
const mcp = new MCPClient({
  servers: {
    sequentialThinking: {
      command: "npx",
      args: [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@smithery-ai/server-sequential-thinking",
        "--config",
        "{}",
      ],
    },
  },
});
```

### 6.5 Ampersand

```typescript
// SSE 方式
const mcp = new MCPClient({
  servers: {
    "@amp-labs/mcp-server": {
      url: `https://mcp.withampersand.com/v1/sse?${new URLSearchParams({
        apiKey: process.env.AMPERSAND_API_KEY,
        project: process.env.AMPERSAND_PROJECT_ID,
        integrationName: process.env.AMPERSAND_INTEGRATION_NAME,
        groupRef: process.env.AMPERSAND_GROUP_REF,
      })}`,
    },
  },
});

// 本地 stdio 方式
const mcp = new MCPClient({
  servers: {
    "@amp-labs/mcp-server": {
      command: "npx",
      args: [
        "-y",
        "@amp-labs/mcp-server@latest",
        "--transport",
        "stdio",
        "--project",
        process.env.AMPERSAND_PROJECT_ID,
        "--integrationName",
        process.env.AMPERSAND_INTEGRATION_NAME,
        "--groupRef",
        process.env.AMPERSAND_GROUP_REF,
      ],
      env: {
        AMPERSAND_API_KEY: process.env.AMPERSAND_API_KEY,
      },
    },
  },
});
```

---

## 7. 发布 MCP 服务器到 NPM

### 7.1 创建 stdio 服务器

```typescript
#!/usr/bin/env node
// src/mastra/stdio.ts

import { MCPServer } from "@mastra/mcp";
import { weatherTool } from "./tools";

const server = new MCPServer({
  name: "my-mcp-server",
  version: "1.0.0",
  tools: { weatherTool },
});

server.startStdio().catch((error) => {
  console.error("Error running MCP server:", error);
  process.exit(1);
});
```

### 7.2 配置 package.json

```json
{
  "name": "@your-org/your-mcp-server",
  "version": "1.0.0",
  "bin": "dist/stdio.js",
  "scripts": {
    "build:mcp": "tsup src/mastra/stdio.ts --format esm --no-splitting --dts && chmod +x dist/stdio.js"
  }
}
```

### 7.3 构建和发布

```bash
# 构建
npm run build:mcp

# 发布
npm publish --access public
```

### 7.4 使用已发布的 MCP 服务器

```typescript
const mcp = new MCPClient({
  servers: {
    yourServer: {
      command: "npx",
      args: ["-y", "@your-org/your-mcp-server@latest"],
    },
  },
});
```

---

## 8. 完整示例

### 8.1 使用 MCP 的智能体

```typescript
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { MCPClient } from "@mastra/mcp";
import { openai } from "@ai-sdk/openai";

// 配置 MCP 客户端
const mcp = new MCPClient({
  id: "multi-source-mcp",
  servers: {
    wikipedia: {
      command: "npx",
      args: ["-y", "wikipedia-mcp"],
    },
    weather: {
      url: new URL(
        `https://server.smithery.ai/@smithery-ai/national-weather-service/mcp?api_key=${process.env.SMITHERY_API_KEY}`
      ),
    },
  },
});

// 创建智能体
const researchAgent = new Agent({
  name: "Research Agent",
  instructions: `
    你是一个研究助手，可以访问：
    - Wikipedia：用于百科知识
    - 国家气象服务：用于天气信息
    
    根据用户问题选择合适的工具。
  `,
  model: openai("gpt-4o-mini"),
  tools: await mcp.getTools(),
});

// 配置 Mastra
const mastra = new Mastra({
  agents: { researchAgent },
});

// 使用智能体
const agent = mastra.getAgent("researchAgent");
const response = await agent.generate("告诉我关于气候变化的信息，以及纽约今天的天气");
console.log(response.text);
```

### 8.2 创建 MCP 服务器

```typescript
import { MCPServer } from "@mastra/mcp";
import { Mastra } from "@mastra/core/mastra";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// 创建工具
const calculatorTool = createTool({
  id: "calculator",
  description: "执行基本数学计算",
  inputSchema: z.object({
    expression: z.string().describe("数学表达式"),
  }),
  outputSchema: z.object({
    result: z.number(),
  }),
  execute: async ({ context }) => {
    const result = eval(context.expression); // 注意：生产环境应使用安全的表达式解析器
    return { result };
  },
});

// 创建 MCP 服务器
const mathServer = new MCPServer({
  id: "math-server",
  name: "Math Server",
  version: "1.0.0",
  tools: { calculatorTool },
});

// 注册到 Mastra
const mastra = new Mastra({
  mcpServers: { mathServer },
});
```

---

## 9. 最佳实践

1. **安全存储凭据** - 将 API 密钥和 URL 存储在环境变量中
2. **选择合适的传输方式** - 本地工具用 stdio，远程服务用 HTTP(S)
3. **管理连接** - 动态客户端使用后调用 `disconnect()`
4. **清晰的 Instructions** - 在智能体说明中描述可用的 MCP 服务器
5. **错误处理** - 处理 MCP 服务器不可用的情况
6. **版本控制** - 发布 MCP 服务器时使用语义版本控制

---

## 10. 参考资料

- [Mastra 官方文档 - MCP](https://mastra.ai/docs/mcp/overview)
- [Mastra 官方文档 - Publishing MCP Server](https://mastra.ai/docs/mcp/publishing-mcp-server)
- [MCP 协议文档](https://modelcontextprotocol.io/introduction)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

