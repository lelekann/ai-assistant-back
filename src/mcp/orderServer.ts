import fs from "fs";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse") as {
  PDFParse: new (opts: { data: Buffer }) => {
    getText(): Promise<{ text: string }>;
    destroy(): Promise<void>;
  };
};
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { mockOrders, mockDocuments, mockDocumentFiles, mockCertificates } from "../mock/orders";

const toolDefinitions = [
  {
    name: "get_order",
    description: "Get full order details: route, product, carrier, shipment info",
    inputSchema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID" },
      },
      required: ["order_id"],
    },
  },
  {
    name: "get_documents",
    description: "Get all documents for an order with their id, filename, type, and status",
    inputSchema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID" },
      },
      required: ["order_id"],
    },
  },
  {
    name: "get_document_content",
    description: "Extract the raw text content of a document file by document ID. Use this to read the actual fields (shipper, consignee, HS code, weight, value, quantity, date, etc.) from each document.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "The document ID (e.g. doc-1)" },
      },
      required: ["document_id"],
    },
  },
  {
    name: "get_certificates",
    description: "Get expiring certificates (ADR, licenses) that affect this order",
    inputSchema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID" },
      },
      required: ["order_id"],
    },
  },
];

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  const orderId = args.order_id as string;

  switch (name) {
    case "get_order":
      return mockOrders.find((o) => o.id === orderId) ?? { error: "Order not found" };

    case "get_documents":
      return mockDocuments[orderId] ?? [];

    case "get_document_content": {
      const docId = args.document_id as string;
      const relativePath = mockDocumentFiles[docId];
      if (!relativePath) {
        return { error: "Document not found" };
      }

      const absolutePath = path.resolve(relativePath);

      if (!fs.existsSync(absolutePath)) {
        return { error: "File not found on disk", path: absolutePath };
      }

      try {
        const buffer = fs.readFileSync(absolutePath);
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        const text = result.text.trim();
        return {
          documentId: docId,
          text,
        };
      } catch (err) {
        return { error: "Could not parse document", detail: String(err) };
      }
    }

    case "get_certificates": {
      const order = mockOrders.find((o) => o.id === orderId);
      if (!order) return [];
      return mockCertificates.filter((c) => c.affectedOrders.includes(order.orderNumber));
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export function createOrderServer(): Server {
  const server = new Server(
    { name: "tms-order-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const result = await handleToolCall(name, args as Record<string, unknown>);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  });

  return server;
}
 