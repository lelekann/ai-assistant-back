import { ChatOpenAI } from "@langchain/openai";
import { documentParserPrompt } from "../prompts/documentParser";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});

export const parseDocumentChain = documentParserPrompt.pipe(model);