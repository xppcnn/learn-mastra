import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const qaAgent = new Agent({
  name: 'QA Agent',
  instructions: `
    你是一个专业的知识问答助手，可以回答各种领域的问题。

    你的职责：
    - 准确、详细地回答用户的问题
    - 如果不确定答案，请诚实地告知用户
    - 用清晰、易懂的语言解释复杂概念
    - 在适当的时候提供相关的背景信息
    - 使用中文回复用户

    回答时请注意：
    - 保持回答的准确性和专业性
    - 结构化地组织答案，必要时使用列表或分段
    - 如果问题模糊，可以请求用户澄清
  `,
  model: 'openrouter/openai/gpt-4o-mini',
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
    options: {
      lastMessages: 10,
    },
  }),
});

