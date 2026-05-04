import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getRequirementsForRoute } from "../services/requirements/rules";

const server = new McpServer({
  name: "requirements-mcp",
  version: "1.0.0",
});

server.tool(
  "get_shipment_requirements",
  "Returns document requirements, issues and checklist for a shipment route and HS code",
  {
    origin: z.string().describe("Origin country code, e.g. PL, DE, NL"),
    destination: z.string().describe("Destination country code, e.g. TR, ES"),
    hsCode: z.string().describe("6-digit HS code of the goods"),
  },
  async ({ origin, destination, hsCode }) => {
    const rules = getRequirementsForRoute(origin, destination, hsCode);

    const checklist = rules.requiredDocs.map((doc) => ({
      id: doc.toLowerCase().replace(/\s/g, "-"),
      name: doc,
      status: "required",
      canAutoGenerate: ["CMR", "Commercial Invoice", "Packing List"].includes(doc),
    }));

    const issues = rules.requirements.map((req) => ({
      id: req.id,
      severity: req.severity,
      title: `${req.documentName} — ${req.condition}`,
      what: req.condition,
      time: req.processingTime ?? "Varies",
      where: req.where ?? "Local authority",
      risk: req.risk,
      alternative: req.alternativeRoute
        ? {
            route: req.alternativeRoute.description,
            additionalTime: req.alternativeRoute.additionalTime,
            additionalCost: req.alternativeRoute.additionalCost,
          }
        : undefined,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ checklist, issues, requiredDocs: rules.requiredDocs }),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Requirements MCP server running");
}

main();