import { createStep, createWorkflow } from "@mastra/core";
import z from "zod";
const step1 = createStep({
  id: "step1",
  inputSchema: z.object({
    userEmail: z.string(),
  }),
  outputSchema: z.object({
    output: z.string(),
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
  }),
  suspendSchema: z.object({
    reason: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend, bail }) => {
    const { userEmail } = inputData;
    const { approved } = resumeData || {};
    if (approved === false) {
      return bail({
        reason: "User not approved.",
      });
    }
    if (!approved) {
      return await suspend({
        reason: "Human approval required.",
      });
    }

    return { output: `Email sent to ${userEmail}` };
  },
});

const suspendWorkflow = createWorkflow({
  id: "suspend-workflow",
  inputSchema: z.object({
    userEmail: z.string(),
  }),
  outputSchema: z.object({
    output: z.string(),
  }),
})
  .then(step1)
  .commit();

export { suspendWorkflow };
