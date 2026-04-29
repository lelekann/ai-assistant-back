import { ChatPromptTemplate } from "@langchain/core/prompts";

export const documentParserPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
You are an expert in international trade and logistics documents.
Extract shipment information from the provided document text.

Rules:
- Return ONLY valid JSON
- No explanations
- Use null for fields not found
- Do not include any text outside JSON
- For dates, use ISO 8601 format (YYYY-MM-DD)
- HS code must be 6 digits if present, otherwise null
    `,
  ],
  [
    "human",
    `
Extract shipment data from this document:

{documentText}

Return format:
{{
  "origin": string | null,
  "destination": string | null,
  "description": string | null,
  "weight": number | null,
  "value": number | null,
  "shipDate": string | null,
  "hsCode": string | null
}}
    `,
  ],
]);