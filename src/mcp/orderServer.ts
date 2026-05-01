import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { mockOrders, mockDocuments, mockCertificates } from "../mock/orders";

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
    description: "Get all documents for an order and their verification status",
    inputSchema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID" },
      },
      required: ["order_id"],
    },
  },
  {
    name: "get_certificates",
    description: "Get expiring certificates that affect this order",
    inputSchema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID" },
      },
      required: ["order_id"],
    },
  },
];

function handleToolCall(name: string, args: Record<string, unknown>): unknown {
  const orderId = args.order_id as string;

  switch (name) {
    case "get_order":
      return mockOrders.find((o) => o.id === orderId) ?? { error: "Order not found" };
    case "get_documents":
      return mockDocuments[orderId] ?? [];
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
    const result = handleToolCall(name, args as Record<string, unknown>);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  });

  return server;
}
