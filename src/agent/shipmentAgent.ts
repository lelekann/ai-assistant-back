import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { tavily } from "@tavily/core";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getHSCode } from "../services/ai/hsCode";
import { ShipmentInput } from "../types/types";
import { generateShipmentDocuments } from "../services/documents/generator";
import dotenv from "dotenv";

dotenv.config();

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });

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

const searchRequirementsTool = tool(
  async ({ query }: { query: string }) => {
    const result = await tavilyClient.search(query, {
      maxResults: 3,
      searchDepth: "basic",
    });
    return JSON.stringify(
      result.results.map((r) => ({
        title: r.title,
        content: r.content,
        url: r.url,
      }))
    );
  },
  {
    name: "search_requirements",
    description:
      "Search for customs requirements, certificates, prohibited goods for a specific country pair and product. Use this to find up-to-date information about what documents are needed.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "Search query, e.g. 'customs import requirements Turkey wooden pallets documents 2024'"
        ),
    }),
  }
);

const AGENT_SYSTEM_PROMPT = `You are a logistics compliance assistant for international shipments.

Your job sequence — follow this ORDER strictly:
1. Use classify_hs_code to get the HS code
2. Use get_shipment_requirements MCP tool to get base rules for the route
3. Use search_requirements to find additional/updated requirements:
   - Search for: "[destination country] customs import [goods type] required documents [current year]"
   - Search for: "[goods type] [HS code] import restrictions [destination country]"
   - If HS code suggests dangerous goods (batteries, chemicals, etc.) — search for ADR requirements
   - If destination is non-EU — search for certificates of origin, EUR.1, phytosanitary needs
4. Use generate_documents to create CMR, invoice and packing list
5. Combine all findings into final JSON

For each issue found, always include:
- severity: "blocker" (shipment will be stopped) | "warning" (may cause delays) | "info" (optimization)
- title: short description
- what: detailed explanation
- time: processing time if document needed
- where: exact authority or organization name
- risk: what happens if ignored
- alternative: alternative route or solution if exists

Respond ONLY with valid JSON, no text outside:
{
  "hsCode": { "hsCode": string, "description": string, "confidence": number, "source": string },
  "checklist": [{ "id": string, "name": string, "status": "generated"|"required"|"conditional", "canAutoGenerate": boolean, "condition"?: string, "processingTime"?: string }],
  "issues": [{ "id": string, "severity": "blocker"|"warning"|"info", "title": string, "what": string, "time": string, "where": string, "risk": string, "alternative"?: { "route": string, "additionalTime": string, "additionalCost": string } }],
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
    tools: [classifyHsCodeTool, searchRequirementsTool, generateDocumentsTool, ...mcpTools],
    prompt: AGENT_SYSTEM_PROMPT,
  });

  return { agent, mcpClient };
};