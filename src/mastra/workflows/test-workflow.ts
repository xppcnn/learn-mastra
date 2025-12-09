import { createStep, createWorkflow } from "@mastra/core";
import z from "zod";

const nestedStep = createStep({
  id: "nested-step",
  inputSchema: z.object({ test: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  stateSchema: z.object({ sharedValue: z.string() }),
  execute: async ({ inputData, state, setState }) => {
    console.log("🚀 ~ inputData:", inputData);
    setState({ ...state, sharedValue: "modified-by-nested-step-shared" });
    return { result: `modified-by-nested-step` };
  },
});

const nestedStep2 = createStep({
  id: "nested-step2",
  inputSchema: z.object({ result: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  stateSchema: z.object({ sharedValue: z.string() }),
  execute: async ({ inputData, state }) => {
    console.log("🚀 ~ state:", inputData);
    return {
      result: `Received: ${inputData.result}, Shared Value: ${state.sharedValue}`,
    };
  },
});

const nestedWorkflow = createWorkflow({
  id: "nested-workflow",
  inputSchema: z.object({ test: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  stateSchema: z.object({ sharedValue: z.string() }),
})
  .then(nestedStep)
  .map(async ({ inputData, getInitData, getStepResult }) => {
    console.log("🚀 ~ getInitData:", getInitData());
    const stepData = await getStepResult(nestedStep);
    console.log("🚀 ~ stepData:", stepData);
    return inputData;
  })
  .then(nestedStep2)
  .commit();

const parentStep = createStep({
  id: "parent-step",
  inputSchema: z.object({ test: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  stateSchema: z.object({ sharedValue: z.string() }),
  execute: async ({ inputData, state, setState }) => {
    console.log("🚀 ~ parent-step:", inputData);
    setState({ ...state, sharedValue: "modified-by-parent" });
    return { result: "modified-by-parent" };
  },
});

const parentWorkflow = createWorkflow({
  id: "parent-workflow",
  inputSchema: z.object({ test: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  stateSchema: z.object({ sharedValue: z.string() }),
})
  .then(parentStep)
  .map(async ({ inputData }) => {
    console.log("🚀 ~ inputData1:", inputData)
    return {
      test: inputData.result + "map -map",
    };
  })
  .then(nestedWorkflow)
  .commit();

export { parentWorkflow };
