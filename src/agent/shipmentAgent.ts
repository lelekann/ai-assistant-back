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
      maxResults: 5,
      searchDepth: "advanced",
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
      "Search for customs requirements, certificates, prohibited goods, authorities and their websites for a specific country pair and product. Extract authority URLs from results.",
    schema: z.object({
      query: z.string().describe(
        "Specific search query about customs requirements, e.g. 'phytosanitary certificate Turkey import where to apply website'"
      ),
    }),
  }
);

const AGENT_SYSTEM_PROMPT = `You are a logistics compliance assistant for international shipments.
Today's date: ${new Date().toISOString().split("T")[0]}.

Follow this sequence STRICTLY, all steps are MANDATORY:

STEP 1 — classify_hs_code
Use it to get the HS code for the goods description.

STEP 2 — get_shipment_requirements
Use MCP tool with origin country name, destination country name, and HS code.
This returns base rules from database. Always use these as starting point.

STEP 3 — search_requirements (ALWAYS REQUIRED, run multiple searches)
Run ALL of the following searches, no exceptions:

Search A: "[destination country] customs import [goods description] required documents [current year]"
Search B: "HS [hsCode] import [destination country] certificates restrictions"
Search C (always for non-EU destination like Turkey, Serbia, Morocco, etc.): 
  "[destination country] import license requirements [goods type] 2024 2025"
Search D (if HS code starts with 01–24, food/agriculture/wood): 
  "phytosanitary certificate [destination country] [goods type] how to get where apply"
Search E (if HS code starts with 84–85, electronics): 
  "ADR dangerous goods transport [goods type] [origin] [destination] certificate"
Search F: "[origin country] [destination country] trade documents certificate of origin EUR1"

From web search results extract:
- Specific authority names with their websites/URLs (e.g. "Turkish Ministry of Agriculture — https://tarim.gov.tr")
- Exact processing times mentioned
- Specific costs if mentioned  
- Alternative solutions mentioned
- Any restrictions or prohibitions

STEP 4 — generate_documents
Generate CMR, Commercial Invoice and Packing List.

STEP 5 — Build final response
Merge MCP base rules + web search findings:
- Start with MCP checklist and issues as base
- Add any NEW requirements found via web search
- For each issue found via web search, include the source URL in the "where" field
- Remove duplicates (same document requirement from both sources = keep one, prefer web search version as more detailed)
- For "where" field: always use format "Authority Name — https://url.com" if URL was found
- For "alternative": provide realistic alternatives based on web search, not generic ones

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON, zero text outside JSON
- Never include markdown, never wrap in backticks
- All string values must be in English

Output format:
{
  "hsCode": { 
    "hsCode": string, 
    "description": string, 
    "confidence": number, 
    "source": string 
  },
  "checklist": [{ 
    "id": string, 
    "name": string, 
    "status": "generated"|"required"|"conditional", 
    "canAutoGenerate": boolean, 
    "condition"?: string, 
    "processingTime"?: string,
    "whereToGet"?: string
  }],
  "issues": [{ 
  "id": string, 
  "severity": "blocker"|"warning"|"info", 
  "title": string, 
  "what": string, 
  "time": string, 
  "where": string,        // Authority name only, e.g. "Turkish Ministry of Agriculture"
  "whereLink": string,    // URL only, e.g. "https://tarim.gov.tr" — REQUIRED if found in search
  "risk": string, 
  "alternative"?: { 
    "route": string, 
    "additionalTime": string, 
    "additionalCost": string 
  } 
}],
  "documents": [{ 
    "id": string, 
    "name": string, 
    "status": "generated", 
    "filename": string 
  }],
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