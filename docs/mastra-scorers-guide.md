# Mastra Scorers（评分器）专题指南

## 1. 什么是 Scorers？

Scorers（评分器）是自动化测试，用于评估智能体输出。评分器返回分数（通常在 0 到 1 之间），量化输出满足评估标准的程度。

### 核心能力
- 📊 **量化评估** - 将主观评估转化为客观分数
- 🤖 **自动化测试** - 自动评估智能体输出
- 📈 **性能追踪** - 随时间监控智能体质量
- 🔧 **可定制** - 创建自定义评分逻辑

---

## 2. 评分器类型

| 类型 | 描述 | 示例 |
|------|------|------|
| **准确性** | 评估答案的正确性和完整性 | 答案相关性、忠实度、幻觉检测 |
| **上下文质量** | 评估上下文的相关性和排序 | 上下文精确度、上下文相关性 |
| **输出质量** | 评估格式、风格和安全性 | 语调一致性、毒性检测、偏见检测 |

---

## 3. 内置评分器

### 3.1 准确性和可靠性评分器

| 评分器 | 描述 | 分数范围 |
|--------|------|----------|
| `answer-relevancy` | 评估响应如何解决输入查询 | 0-1（越高越好）|
| `answer-similarity` | 与标准答案进行语义比较 | 0-1（越高越好）|
| `faithfulness` | 测量响应对上下文的准确表示 | 0-1（越高越好）|
| `hallucination` | 检测事实矛盾和无支持的声明 | 0-1（越低越好）|
| `completeness` | 检查响应是否包含所有必要信息 | 0-1（越高越好）|
| `content-similarity` | 使用字符级匹配测量文本相似性 | 0-1（越高越好）|
| `textual-difference` | 测量字符串之间的文本差异 | 0-1（越高越相似）|
| `tool-call-accuracy` | 评估 LLM 是否选择了正确的工具 | 0-1（越高越好）|
| `prompt-alignment` | 测量响应与提示意图的对齐程度 | 0-1（越高越好）|

### 3.2 上下文质量评分器

| 评分器 | 描述 |
|--------|------|
| `context-precision` | 使用平均精确度评估上下文相关性和排序 |
| `context-relevance` | 测量上下文效用，包含使用追踪和缺失检测 |

### 3.3 输出质量评分器

| 评分器 | 描述 |
|--------|------|
| `tone-consistency` | 测量正式性、复杂性和风格的一致性 |
| `toxicity` | 检测有害或不当内容 |
| `bias` | 检测输出中的潜在偏见 |
| `keyword-coverage` | 评估技术术语的使用 |

---

## 4. 使用内置评分器

### 4.1 安装

```bash
npm install @mastra/evals@latest
```

### 4.2 添加到智能体

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import {
  createAnswerRelevancyScorer,
  createToxicityScorer,
  createFaithfulnessScorer,
} from "@mastra/evals/scorers/llm";

export const evaluatedAgent = new Agent({
  name: "evaluated-agent",
  instructions: "你是一个有帮助的助手。",
  model: openai("gpt-4o-mini"),
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: openai("gpt-4o-mini") }),
      sampling: { type: "ratio", rate: 0.5 }, // 评估 50% 的响应
    },
    toxicity: {
      scorer: createToxicityScorer({ model: openai("gpt-4o-mini") }),
      sampling: { type: "ratio", rate: 1 }, // 评估所有响应
    },
    faithfulness: {
      scorer: createFaithfulnessScorer({ model: openai("gpt-4o-mini") }),
      sampling: { type: "ratio", rate: 0.3 }, // 评估 30% 的响应
    },
  },
});
```

### 4.3 添加到工作流步骤

```typescript
import { createStep } from "@mastra/core/workflows";
import { customStepScorer } from "../scorers/custom-step-scorer";

const contentStep = createStep({
  id: "content-step",
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.object({ text: z.string() }),
  execute: async ({ inputData, mastra }) => {
    // 执行逻辑
    return { text: "..." };
  },
  scorers: {
    customStepScorer: {
      scorer: customStepScorer(),
      sampling: { type: "ratio", rate: 1 },
    },
  },
});
```

### 4.4 采样控制

`sampling.rate` 参数（0-1）控制评估的响应百分比：

- `1.0`: 评估所有响应（100%）
- `0.5`: 评估一半响应（50%）
- `0.1`: 评估 10% 的响应
- `0.0`: 禁用评分

---

## 5. 创建自定义评分器

### 5.1 评分器流水线

所有评分器遵循四步评估流水线：

```
1. preprocess（预处理）- 可选：准备或转换数据
        ↓
2. analyze（分析）- 可选：执行评估分析
        ↓
3. generateScore（生成分数）- 必需：转换为数值分数
        ↓
4. generateReason（生成原因）- 可选：生成人类可读的解释
```

### 5.2 基本自定义评分器

```typescript
import { createScorer } from "@mastra/core/scores";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const glutenCheckerScorer = createScorer({
  name: "Gluten Checker",
  description: "检查食谱是否含有麸质",
  judge: {
    model: openai("gpt-4o"),
    instructions: "你是一个识别食谱中麸质的厨师。",
  },
})
  .analyze({
    description: "分析输出中的麸质",
    outputSchema: z.object({
      isGlutenFree: z.boolean(),
      glutenSources: z.array(z.string()),
    }),
    createPrompt: ({ run }) => `
      检查这个食谱是否无麸质：
      ${run.output.text}
      
      检查：小麦、大麦、黑麦、面粉、意面、面包等
      
      返回 JSON 格式：
      {
        "isGlutenFree": boolean,
        "glutenSources": ["含有麸质的成分列表"]
      }
    `,
  })
  .generateScore(({ results }) => {
    return results.analyzeStepResult.isGlutenFree ? 1 : 0;
  })
  .generateReason({
    description: "生成评分原因",
    createPrompt: ({ results }) => `
      解释为什么这个食谱${results.analyzeStepResult.isGlutenFree ? "无麸质" : "含有麸质"}。
      ${results.analyzeStepResult.glutenSources.length > 0 
        ? `麸质来源：${results.analyzeStepResult.glutenSources.join(", ")}` 
        : "未发现含麸质成分"}
    `,
  });
```

### 5.3 使用函数的自定义评分器

```typescript
const wordCountScorer = createScorer({
  name: "Word Count Checker",
  description: "检查响应的字数",
})
  .preprocess(({ run }) => {
    const text = run.output.text;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return { text, wordCount };
  })
  .generateScore(({ results }) => {
    const { wordCount } = results.preprocessStepResult;
    // 100 字为理想长度
    const idealLength = 100;
    const score = Math.max(0, 1 - Math.abs(wordCount - idealLength) / idealLength);
    return score;
  })
  .generateReason(({ results, score }) => {
    const { wordCount } = results.preprocessStepResult;
    return `响应包含 ${wordCount} 个字。分数：${score.toFixed(2)}`;
  });
```

### 5.4 混合函数和 LLM

```typescript
const hybridScorer = createScorer({
  name: "Hybrid Scorer",
  description: "使用函数预处理，LLM 分析",
  judge: {
    model: openai("gpt-4o-mini"),
    instructions: "你是一个内容质量评估员。",
  },
})
  // 函数：预处理
  .preprocess(({ run }) => {
    const text = run.output.text.toLowerCase();
    const hasCommonWords = /the|and|is|are/.test(text);
    return { text, hasCommonWords };
  })
  // LLM：分析
  .analyze({
    description: "分析内容质量",
    outputSchema: z.object({
      quality: z.enum(["high", "medium", "low"]),
      issues: z.array(z.string()),
    }),
    createPrompt: ({ results }) => `
      评估以下文本的质量：
      "${results.preprocessStepResult.text}"
      
      返回 JSON 格式：
      { "quality": "high|medium|low", "issues": ["问题列表"] }
    `,
  })
  // 函数：生成分数
  .generateScore(({ results }) => {
    const qualityMap = { high: 1, medium: 0.5, low: 0 };
    return qualityMap[results.analyzeStepResult.quality];
  });
```

---

## 6. 运行评分器

### 6.1 直接运行

```typescript
const result = await glutenCheckerScorer.run({
  input: [{ role: "user", content: "混合米饭、豆类和蔬菜" }],
  output: { text: "混合米饭、豆类和蔬菜" },
});

console.log("分数:", result.score);
console.log("原因:", result.reason);
console.log("分析结果:", result.analyzeStepResult);
```

### 6.2 输出示例

```typescript
// 无麸质食谱
{
  score: 1,
  analyzeStepResult: {
    isGlutenFree: true,
    glutenSources: []
  },
  reason: "这个食谱无麸质，因为米饭、豆类和蔬菜都是天然无麸质的成分。"
}

// 含麸质食谱
{
  score: 0,
  analyzeStepResult: {
    isGlutenFree: false,
    glutenSources: ["面粉"]
  },
  reason: "这个食谱含有麸质，因为它包含面粉。普通面粉由小麦制成，含有麸质。"
}
```

---

## 7. 实时评估

### 7.1 工作原理

- **异步执行**：评估在后台运行，不阻塞响应
- **采样控制**：通过 `sampling.rate` 控制评估百分比
- **自动存储**：评分结果自动存储在 `mastra_scorers` 表中

### 7.2 配置存储

```typescript
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";

export const mastra = new Mastra({
  agents: { evaluatedAgent },
  storage: new LibSQLStore({
    url: "file:./mastra.db",
  }),
});
```

---

## 8. 跟踪评估

### 8.1 启用可观察性

```typescript
import { Mastra } from "@mastra/core/mastra";

export const mastra = new Mastra({
  agents: { evaluatedAgent },
  scorers: {
    answerRelevancy: myAnswerRelevancyScorer,
    responseQuality: myResponseQualityScorer,
  },
  observability: {
    default: { enabled: true },
  },
});
```

### 8.2 在 Studio 中评分跟踪

注册评分器后，可以在 Studio 的可观察性部分交互式地对历史跟踪进行评分。

---

## 9. 完整示例

```typescript
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { createScorer } from "@mastra/core/scores";
import { LibSQLStore } from "@mastra/libsql";
import { openai } from "@ai-sdk/openai";
import {
  createAnswerRelevancyScorer,
  createToxicityScorer,
} from "@mastra/evals/scorers/llm";
import { z } from "zod";

// 自定义评分器
const responseQualityScorer = createScorer({
  name: "Response Quality",
  description: "评估响应的整体质量",
  judge: {
    model: openai("gpt-4o-mini"),
    instructions: "你是一个响应质量评估员。",
  },
})
  .analyze({
    description: "分析响应质量",
    outputSchema: z.object({
      clarity: z.number().min(0).max(1),
      helpfulness: z.number().min(0).max(1),
      accuracy: z.number().min(0).max(1),
    }),
    createPrompt: ({ run }) => `
      评估以下响应的质量（0-1 分）：
      
      用户问题：${run.input[0]?.content}
      助手响应：${run.output.text}
      
      返回 JSON：{ "clarity": 0-1, "helpfulness": 0-1, "accuracy": 0-1 }
    `,
  })
  .generateScore(({ results }) => {
    const { clarity, helpfulness, accuracy } = results.analyzeStepResult;
    return (clarity + helpfulness + accuracy) / 3;
  })
  .generateReason(({ results, score }) => {
    const { clarity, helpfulness, accuracy } = results.analyzeStepResult;
    return `质量评分：${score.toFixed(2)}（清晰度：${clarity}，有用性：${helpfulness}，准确性：${accuracy}）`;
  });

// 智能体配置
const evaluatedAgent = new Agent({
  name: "evaluated-agent",
  instructions: "你是一个有帮助的助手。",
  model: openai("gpt-4o-mini"),
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: openai("gpt-4o-mini") }),
      sampling: { type: "ratio", rate: 1 },
    },
    toxicity: {
      scorer: createToxicityScorer({ model: openai("gpt-4o-mini") }),
      sampling: { type: "ratio", rate: 1 },
    },
    quality: {
      scorer: responseQualityScorer,
      sampling: { type: "ratio", rate: 1 },
    },
  },
});

// Mastra 配置
const mastra = new Mastra({
  agents: { evaluatedAgent },
  scorers: { responseQualityScorer },
  storage: new LibSQLStore({ url: "file:./mastra.db" }),
  observability: { default: { enabled: true } },
});
```

---

## 10. 最佳实践

1. **选择合适的评分器** - 根据评估目标选择内置或自定义评分器
2. **合理设置采样率** - 高流量场景下降低采样率以控制成本
3. **使用小模型** - 评分器可以使用较小的模型以降低成本
4. **组合多个评分器** - 从多个维度评估智能体质量
5. **监控分数趋势** - 随时间追踪分数变化以发现问题
6. **在 CI/CD 中使用** - 将评分器集成到测试流水线中

---

## 11. 参考资料

- [Mastra 官方文档 - Scorers](https://mastra.ai/docs/scorers/overview)
- [Mastra 官方文档 - Built-in Scorers](https://mastra.ai/docs/scorers/built-in-scorers)
- [Mastra 官方文档 - Custom Scorers](https://mastra.ai/docs/scorers/custom-scorers)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

