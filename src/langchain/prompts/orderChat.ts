import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

export const orderChatPrompt = ChatPromptTemplate.fromMessages([
  ["system", "{orderContext}"],
  new MessagesPlaceholder("history"),
  ["human", "{message}"],
]);
