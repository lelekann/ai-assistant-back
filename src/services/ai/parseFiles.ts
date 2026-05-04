// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";
import Tesseract from "tesseract.js";
import { parseDocumentChain } from "../../langchain/chains/parseDocument";

const safeParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return null;
  }
};

const extractText = async (file: Express.Multer.File): Promise<string> => {
  const { mimetype, buffer } = file;

  if (mimetype === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimetype === "image/jpeg" || mimetype === "image/png") {
    const { data } = await Tesseract.recognize(buffer, "eng");
    return data.text;
  }

  return "";
};

export type ParsedShipmentData = {
  origin?: string;
  destination?: string;
  description?: string;
  weight?: number;
  value?: number;
  shipDate?: string;
  hsCode?: string | null;
};

export const parseFilesForShipmentData = async (
  files: Express.Multer.File[]
): Promise<ParsedShipmentData> => {
  // Extract text from all files and merge
  const texts = await Promise.all(files.map(extractText));
  const combinedText = texts.join("\n\n---\n\n");

  const response = (await parseDocumentChain.invoke({
    documentText: combinedText,
  })) as { content: string };

  const text =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const parsed = safeParse(text);
  if (!parsed) return {};

  // Clean nulls
  return Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== null)
  ) as ParsedShipmentData;
};