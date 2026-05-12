import OpenAI from "openai";

export const returnAnalysisTool: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "return_analysis",
    description:
      "Return the final structured compliance report. Call this after gathering all data.",
    parameters: {
      type: "object",
      properties: {
        orderId: {type: "string"},
        status: {type: "string", enum: ["ok", "warning", "error"]},
        summary: {
          type: "string",
          description: "2-3 sentence overview of compliance status",
        },
        documentChecklist: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {type: "string"},
              name: {type: "string"},
              status: {
                type: "string",
                enum: [
                  "required",
                  "conditional",
                  "not-needed",
                  "verified",
                  "pending",
                  "error",
                  "checking",
                  "generated",
                ],
              },
              note: {type: "string"},
            },
            required: ["id", "name", "status"],
          },
        },
        transitCountries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {type: "string"},
              status: {type: "string", enum: ["ok", "issue", "assumed"]},
              requirements: {type: "array", items: {type: "string"}},
              note: {type: "string"},
            },
            required: ["name", "status", "requirements"],
          },
        },
        carrier: {
          type: "object",
          properties: {
            status: {type: "string", enum: ["ok", "warning", "error"]},
            issues: {type: "array", items: {type: "string"}},
          },
          required: ["status", "issues"],
        },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {type: "string"},
              severity: {type: "string", enum: ["blocker", "warning", "info"]},
              title: {type: "string"},
              what: {type: "string"},
              time: {type: "string"},
              where: {type: "string"},
              whereLink: {type: "string"},
              risk: {type: "string"},
              documentFilename: {
                type: "string",
                description:
                  "Filename of the document this issue is tied to, e.g. 'Invoice.pdf'",
              },
              field: {
                type: "string",
                description:
                  "Field name this issue is tied to, matching crossCheck.field",
              },
              alternative: {
                type: "object",
                properties: {
                  route: {type: "string"},
                  additionalTime: {type: "string"},
                  additionalCost: {type: "string"},
                },
                required: ["route", "additionalTime", "additionalCost"],
              },
            },
            required: [
              "id",
              "severity",
              "title",
              "what",
              "time",
              "where",
              "whereLink",
              "risk",
            ],
          },
        },
        crossCheck: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: {type: "string"},
              documentA: {type: "string"},
              documentB: {type: "string"},
              valueA: {type: "string"},
              valueB: {type: "string"},
              conflict: {type: "boolean"},
              recommendedValue: {type: "string"},
            },
            required: [
              "field",
              "documentA",
              "documentB",
              "valueA",
              "valueB",
              "conflict",
            ],
          },
        },
      },
      required: [
        "orderId",
        "status",
        "summary",
        "documentChecklist",
        "transitCountries",
        "carrier",
        "issues",
        "crossCheck",
        "expiringCertificates",
      ],
    },
  },
};
