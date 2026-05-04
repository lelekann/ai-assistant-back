import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getHSCode } from "../services/ai/hsCode";
import { ShipmentInput } from "../types/types";
import { generateShipmentDocuments } from "../services/documents/generator";

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

const generateDocumentsTool = tool(
  async ({ input, hsCode }: { input: ShipmentInput; hsCode: string }) => {
    const docs = await generateShipmentDocuments(input, hsCode);
    return JSON.stringify(docs.map((d) => ({ id: d.id, name: d.name, status: d.status, filename: d.filename })));
  },
  {
    name: "generate_documents",
    description: "Generates CMR, Commercial Invoice and Packing List PDF documents for the shipment",
    schema: z.object({
      input: z.object({
        origin: z.string().optional(),
        destination: z.string().optional(),
        description: z.string().optional(),
        weight: z.number().optional(),
        value: z.number().optional(),
        shipDate: z.string().optional(),
      }),
      hsCode: z.string(),
    }),
  }
);

const AGENT_SYSTEM_PROMPT = `You are a logistics compliance assistant for international shipments.

Your job:
1. Classify the goods using classify_hs_code tool
2. Check shipment requirements using get_shipment_requirements tool
3. Use generate_documents to create CMR, invoice and packing list
4. Return structured JSON with results

Always use tools in order: first classify_hs_code, then get_shipment_requirements.
Always respond with valid JSON only — no explanations outside JSON.

Response format:
{
  "hsCode": { "hsCode": string, "description": string, "confidence": number, "source": string },
  "checklist": [...],
  "issues": [...],
  "documents": [{ "id": string, "name": string, "status": "generated", "filename": string }],
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
    tools: [classifyHsCodeTool, generateDocumentsTool, ...mcpTools],
    prompt: AGENT_SYSTEM_PROMPT,
  });

  return { agent, mcpClient };
};