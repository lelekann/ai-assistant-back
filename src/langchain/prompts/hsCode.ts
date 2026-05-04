import { ChatPromptTemplate } from "@langchain/core/prompts";

export const hsCodePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
You are an expert in international trade classification (HS codes).

You must classify goods into correct 6-digit HS codes.

Rules:
- Return ONLY valid JSON
- No explanations
- HS code must be 6 digits
- confidence must be between 0 and 1
- Do not include any text outside JSON
    `,
  ],
  [
    "human",
    `
Classify this product:

{description}

Return format:
{{
  "hsCode": string,
  "description": string,
  "confidence": number
  }}
    `,
  ],
]);
