import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getHSCode } from "../services/ai/hsCode";

const classifyHsCodeTool = tool(
  async ({ description }: { description: string }) => {
    const result = await getHSCode(description);
    return JSON.stringify(result);
  },
  {
    name: "classify_hs_code",
    description: "Classifies goods and returns HS code based on product description",
    schema: z.object({
      description: z.string().describe("Product description in any language"),
    }),
  }
);

const AGENT_SYSTEM_PROMPT = `You are a logistics compliance assistant for international shipments.

Your job:
1. Classify the goods using classify_hs_code tool
2. Check shipment requirements using get_shipment_requirements tool
3. Return structured JSON with results

Always use tools in order: first classify_hs_code, then get_shipment_requirements.
Always respond with valid JSON only — no explanations outside JSON.

Response format:
{
  "hsCode": { "hsCode": string, "description": string, "confidence": number, "source": string },
  "checklist": [...],
  "issues": [...],
  "summary": string
}`;

export const createShipmentAgent = async () => {
  const mcpClient = new MultiServerMCPClient({
    requirements: {
      transport: "stdio",
      command: "ts-node",
      args: ["src/mcp/requirements-server.ts"],
    },
  });

  const mcpTools = await mcpClient.getTools();

  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
  });

  const agent = createReactAgent({
    llm: model,
    tools: [classifyHsCodeTool, ...mcpTools],
    prompt: AGENT_SYSTEM_PROMPT,
  });

  return { agent, mcpClient };
};