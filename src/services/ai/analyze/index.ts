import OpenAI from "openai";
import {AgentOutput} from "../../../types/types";
import {SYSTEM_PROMPT} from "./prompt";
import {returnAnalysisTool} from "./tools";
import {createMCPClient, getOpenAI} from "./mcpClient";

export async function runAnalyzeAgent(orderId: string): Promise<AgentOutput> {
  const mcp = await createMCPClient();

  try {
    const {tools: mcpTools} = await mcp.listTools();
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
      {role: "system", content: SYSTEM_PROMPT},
      {
        role: "user",
        content: `Analyze order "${orderId}". Follow the workflow defined in the system prompt and call return_analysis with the complete result.`,
      },
    ];

    for (let iteration = 0; iteration < 40; iteration++) {
      const forceFinish = iteration >= 10;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-5.4-mini",
        messages,
        tools: allTools,
        tool_choice: forceFinish
          ? { type: "function", function: { name: "return_analysis" } }
          : "auto",
      });

      const choice = response.choices[0];
      messages.push(choice.message);

      if (choice.finish_reason === "stop") {
        messages.push({ role: "user", content: "Call return_analysis with your complete findings now." });
        continue;
      }

      if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
        const fnCalls = choice.message.tool_calls.filter(
          (c) => c.type === "function",
        );

        const finalCall = fnCalls.find(
          (c) => c.type === "function" && c.function.name === "return_analysis",
        );
        if (finalCall && finalCall.type === "function") {
          return JSON.parse(finalCall.function.arguments) as AgentOutput;
        }
        for (const call of fnCalls) {
          if (call.type !== "function") continue;
          const args = JSON.parse(call.function.arguments) as Record<
            string,
            unknown
          >;

          const mcpResult = await mcp.callTool({
            name: call.function.name,
            arguments: args,
          });
          const content = mcpResult.content as {type: string; text?: string}[];
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
