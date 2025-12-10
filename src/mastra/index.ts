import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { chatRoute } from "@mastra/ai-sdk";
import { weatherWorkflow } from "./workflows/weather-workflow";
import { weatherAgent } from "./agents/weather-agent";
import { qaAgent } from "./agents/qa-agent";
import {
  toolCallAppropriatenessScorer,
  completenessScorer,
  translationScorer,
} from "./scorers/weather-scorer";
import { parentWorkflow } from "./workflows/test-workflow";
import { suspendWorkflow } from "./workflows/suspend-workflow";

export const mastra = new Mastra({
  workflows: { weatherWorkflow, parentWorkflow, suspendWorkflow },
  agents: { weatherAgent, qaAgent },
  scorers: {
    toolCallAppropriatenessScorer,
    completenessScorer,
    translationScorer,
  },
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false,
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true },
  },
  server: {
    apiRoutes: [
      // 知识问答 agent 的 AI SDK v5 兼容 API 接口
      chatRoute({
        path: "/qa",
        agent: "qaAgent",
      }),
    ],
  },
});
