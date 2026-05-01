import { ChatOpenAI } from "@langchain/openai";
import { orderChatPrompt } from "../prompts/orderChat";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

export const orderChatChain = orderChatPrompt.pipe(model);
