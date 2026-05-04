import OpenAI from "openai";
import { AgentOutput } from "../../../types/types";
import { SYSTEM_PROMPT } from "./prompt";
import { returnAnalysisTool } from "./tools";
import { createMCPClient, getOpenAI } from "./mcpClient";

export async function runAnalyzeAgent(orderId: string): Promise<AgentOutput> {
  const mcp = await createMCPClient();

  try {
    const { tools: mcpTools } = await mcp.listTools();
    const dataTools: OpenAI.Chat.ChatCompletionTool[] = mcpTools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description ?? "",
        parameters: t.inputSchema as Record<string, unknown>,
      },
    }));

    const allTools = [...dataTools, returnAnalysisTool];

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analyze order ID "${orderId}". Call get_order, get_documents, and get_certificates to gather the data. Then perform the compliance analysis yourself and call return_analysis with the structured result.`,
      },
    ];

    for (let iteration = 0; iteration < 10; iteration++) {
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: allTools,
        tool_choice: "auto",
      });

      const choice = response.choices[0];
      messages.push(choice.message);

      if (choice.finish_reason === "stop") break;

      if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
        const fnCalls = choice.message.tool_calls.filter((c) => c.type === "function");

        for (const call of fnCalls) {
          if (call.type === "function" && call.function.name === "return_analysis") {
            return JSON.parse(call.function.arguments) as AgentOutput;
          }
        }

        for (const call of fnCalls) {
          if (call.type !== "function") continue;
          const args = JSON.parse(call.function.arguments) as Record<string, unknown>;

          const mcpResult = await mcp.callTool({ name: call.function.name, arguments: args });
          const content = mcpResult.content as { type: string; text?: string }[];
          const text = content
            .filter((c) => c.type === "text" && c.text)
            .map((c) => c.text as string)
            .join("");

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: text,
          });
        }
      }
    }

    throw new Error("Agent did not return analysis within iteration limit");
  } finally {
    await mcp.close();
  }
}
