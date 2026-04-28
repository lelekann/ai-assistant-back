import { classifyProductChain } from "../../langchain/chains/classifyProduct";
import { hsFallbackRules } from "./HSFallback";

const safeParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  }
};

export const getHSCode = async (description: string) => {
  try {
    const response = (await classifyProductChain.invoke({
      description,
    })) as { content: string };

    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const parsed = safeParse(text);

    if (!parsed || !parsed.hsCode) {
      throw new Error("Invalid HS response");
    }

    return {
      hsCode: parsed.hsCode,
      description: parsed.description,
      confidence: parsed.confidence,
      source: "ai",
    };
  } catch (error) {
    console.warn("AI HS classification failed, using fallback");

    const lower = description.toLowerCase();

    for (const rule of hsFallbackRules) {
      if (rule.keywords.some((k) => lower.includes(k))) {
        return {
          hsCode: rule.hsCode,
          description: rule.description,
          confidence: 0.5,
          source: "fallback",
        };
      }
    }

    return {
      hsCode: "000000",
      description: "Unknown product",
      confidence: 0,
      source: "fallback",
    };
  }
};
