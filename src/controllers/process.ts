import { Request, Response } from "express";
import { z } from "zod";
import { parseFilesForShipmentData } from "../services/ai/parseFiles";
import { createShipmentAgent } from "../agent/shipmentAgent";
import { ShipmentInput } from "../types/types";
import { generateShipmentDocuments } from "../services/documents/generator";

const shipmentSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  description: z.string().optional(),
  weight: z.coerce.number().optional(),
  value: z.coerce.number().optional(),
  shipDate: z.string().optional(),
  files: z.any().optional(),
});

const safeParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return null;
  }
};

export const processShipment = async (req: Request, res: Response) => {
  let mcpClient;

  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const hasFiles = files && files.length > 0;

    let input: z.infer<typeof shipmentSchema>;

    if (hasFiles) {
      input = await parseFilesForShipmentData(files);
    } else {
      const parsed = shipmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid input",
          details: parsed.error.format(),
        });
      }
      input = parsed.data;
    }

    // Запускаємо агента
const { agent, mcpClient: client } = await createShipmentAgent();
mcpClient = client;

    const agentInput = `
      Process this shipment:
      - Product: ${input.description ?? "unknown"}
      - Origin: ${input.origin ?? "unknown"}
      - Destination: ${input.destination ?? "unknown"}
      - Weight: ${input.weight ?? "unknown"} kg
      - Value: ${input.value ?? "unknown"}
      - Ship date: ${input.shipDate ?? "unknown"}
    `;

   const agentResult = await agent.invoke({
  messages: [{ role: "user", content: agentInput }],
});

    // Агент повертає JSON у output
    const lastMessage = agentResult.messages[agentResult.messages.length - 1];
const parsed = safeParse(lastMessage?.content as string);

const documents = await generateShipmentDocuments(
  input as ShipmentInput,
  parsed?.hsCode?.hsCode ?? "000000"
);

    return res.json({
      input,
      ...parsed,
      documents,
    });

  } catch (error) {
    console.error("Process shipment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    // Закриваємо MCP з'єднання
    if (mcpClient) await mcpClient.close();
  }
};