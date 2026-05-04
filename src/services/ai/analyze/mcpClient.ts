import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createOrderServer } from "../../../mcp/orderServer";

let openaiClient: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI();
  return openaiClient;
}

export async function createMCPClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const server = createOrderServer();
  await server.connect(serverTransport);

  const client = new Client({ name: "tms-agent", version: "1.0.0" });
  await client.connect(clientTransport);

  return client;
}
