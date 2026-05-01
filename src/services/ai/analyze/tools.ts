import OpenAI from "openai";

export const returnAnalysisTool: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "return_analysis",
    description: "Return the final structured compliance report. Call this after gathering all data.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        status: { type: "string", enum: ["ok", "warning", "error"] },
        summary: { type: "string", description: "2-3 sentence overview of compliance status" },
        documentChecklist: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              status: {
                type: "string",
                enum: ["required", "conditional", "not-needed", "generated", "checking", "error", "pending"],
              },
              note: { type: "string" },
            },
            required: ["id", "name", "status"],
          },
        },
        transitCountries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              status: { type: "string", enum: ["ok", "issue", "assumed"] },
              requirements: { type: "array", items: { type: "string" } },
              note: { type: "string" },
            },
            required: ["name", "status", "requirements"],
          },
        },
        carrier: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok", "warning", "error"] },
            issues: { type: "array", items: { type: "string" } },
          },
          required: ["status", "issues"],
        },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              severity: { type: "string", enum: ["blocker", "warning", "info"] },
              title: { type: "string", description: "Short one-line description of the issue" },
              what: { type: "string", description: "Full explanation of what the issue is and why it matters" },
              time: { type: "string", description: "Processing time or urgency" },
              where: { type: "string", description: "Where to resolve it — authority, office, or document name" },
              whereLink: { type: "string", description: "URL to the relevant authority or resource, or '#' if unknown" },
              risk: { type: "string", description: "What happens if this issue is not resolved" },
              alternative: {
                type: "object",
                properties: {
                  route: { type: "string" },
                  additionalTime: { type: "string" },
                  additionalCost: { type: "string" },
                },
                required: ["route", "additionalTime", "additionalCost"],
              },
            },
            required: ["id", "severity", "title", "what", "time", "where", "whereLink", "risk"],
          },
        },
        crossCheck: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              documentA: { type: "string" },
              documentB: { type: "string" },
              valueA: { type: "string" },
              valueB: { type: "string" },
              conflict: { type: "boolean" },
            },
            required: ["field", "documentA", "documentB", "valueA", "valueB", "conflict"],
          },
        },
        expiringCertificates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              holder: { type: "string" },
              daysRemaining: { type: "number" },
              affectedOrders: { type: "array", items: { type: "string" } },
              acknowledged: { type: "boolean" },
            },
            required: ["id", "name", "holder", "daysRemaining", "affectedOrders", "acknowledged"],
          },
        },
      },
      required: [
        "orderId", "status", "summary", "documentChecklist",
        "transitCountries", "carrier", "issues", "crossCheck", "expiringCertificates",
      ],
    },
  },
};
