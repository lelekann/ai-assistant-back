import { ChatOpenAI } from "@langchain/openai";
import { hsCodePrompt } from "../prompts/hsCode";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

export const classifyProductChain = hsCodePrompt.pipe(model);