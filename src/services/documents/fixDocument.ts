import fs from "fs";
import path from "path";
import { TMSDocument, TMSOrder } from "../../types/types";
import { mockDocumentFiles } from "../../mock/orders";
import { generateShipmentDocuments } from "./generator";
import { orderToInput } from "./orderToInput";

const DOC_INDEX: Record<string, number> = {
  "doc-1": 0,
  "doc-2": 1,
  "doc-3": 2,
};

export async function fixDocument(
  doc: TMSDocument,
  order: TMSOrder
): Promise<{ filePath: string }> {
  const index = DOC_INDEX[doc.id];
  if (index === undefined) throw new Error(`No generator index for doc ${doc.id}`);

  const originalRelative = mockDocumentFiles[doc.id];
  if (!originalRelative) throw new Error(`No file mapping for doc ${doc.id}`);

  const input = orderToInput(order);
  const generated = await generateShipmentDocuments(input, order.product.hsCode);
  const buffer = Buffer.from(generated[index].base64, "base64");

  const fixedRelative = originalRelative.replace("/original/", "/fixed/");
  const fixedAbsolute = path.resolve(fixedRelative);

  fs.mkdirSync(path.dirname(fixedAbsolute), { recursive: true });
  fs.writeFileSync(fixedAbsolute, buffer);

  return { filePath: fixedRelative };
}
