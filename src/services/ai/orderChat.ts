import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { orderChatChain } from "../../langchain/chains/orderChat";
import { AnalysisResult, TMSOrder } from "../../types/types";

export type ChatHistoryMessage = { role: "user" | "agent"; content: string };

function buildOrderContext(order: TMSOrder, analysis?: AnalysisResult): string {
  const issues =
    analysis?.issues
      .map((i) => `- [${i.severity.toUpperCase()}] ${i.title}`)
      .join("\n") ?? "None";

  const checklist =
    analysis?.checklist
      .map((c) => `- ${c.name}: ${c.status}${c.note ? ` (${c.note})` : ""}`)
      .join("\n") ?? "Not available";

  const transitCountries =
    analysis?.transitCountries
      .map((t) => `- ${t.name}: ${t.status}${t.note ? ` — ${t.note}` : ""}`)
      .join("\n") ?? order.route.transitCountries.join(", ");

  const carrierIssues =
    analysis?.carrierVerification.issues.join("; ") ?? "None";

  return `You are a TMS (Transport Management System) AI assistant helping a logistics operator manage shipment order ${order.orderNumber}.

ORDER DETAILS
- Route: ${order.route.origin} → ${order.route.destination}
- Transit countries: ${order.route.transitCountries.join(", ")}
- Shipment date: ${order.shipmentDate}
- Product: ${order.product.description} (HS code: ${order.product.hsCode})
- Quantity: ${order.quantity.amount} ${order.quantity.unit}
- Weight: ${order.weight.amount} ${order.weight.unit}
- Declared value: ${order.declaredValue.amount} ${order.declaredValue.currency}
- Carrier: ${order.carrier.name}
- Driver: ${order.carrier.driver}
- Truck: ${order.carrier.truck}

CURRENT ISSUES
${issues}

DOCUMENT CHECKLIST
${checklist}

TRANSIT COUNTRIES STATUS
${transitCountries}

CARRIER VERIFICATION
- Overall: ${analysis?.carrierVerification.status ?? "unknown"}
- Issues: ${carrierIssues}

INSTRUCTIONS
- Answer questions about this specific order only
- Explain compliance issues clearly and suggest how to resolve them
- Be concise, professional, and actionable
- If asked to fix something, explain the steps the operator needs to take`;
}

export const chatWithOrderAI = async (
  order: TMSOrder,
  message: string,
  history: ChatHistoryMessage[] = [],
  analysis?: AnalysisResult
): Promise<string> => {
  const orderContext = buildOrderContext(order, analysis);

  const langchainHistory = history.map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );

  const response = (await orderChatChain.invoke({
    orderContext,
    history: langchainHistory,
    message,
  })) as { content: string };

  return typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);
};
