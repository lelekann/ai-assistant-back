import { Request, Response } from "express";
import { z } from "zod";

import { getHSCode } from "../services/ai/hsCode";
import { parseFilesForShipmentData } from "../services/ai/parseFiles";
// import { buildRoute } from "../services/shipment/route";
// import { getRequirements } from "../services/shipment/requirements";
// import { validateDocuments } from "../services/shipment/validation";
// import { generateRecommendations } from "../services/ai/recommendations";
// import { generateDocuments } from "../services/documents/generator";

const shipmentSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  description: z.string().optional(),
  weight: z.coerce.number().optional(),
  value: z.coerce.number().optional(),
  shipDate: z.string().optional(),

  files: z.any().optional(),
});

export const processShipment = async (req: Request, res: Response) => {
  try {
    // 1. Validate input
    const files = req.files as Express.Multer.File[] | undefined;
    const hasFiles = files && files.length > 0;

    let input: z.infer<typeof shipmentSchema>;
    let hsCodeFromDocs: string | null = null;

    if (hasFiles) {
      // --- File mode: extract everything from documents ---
      const parsed = await parseFilesForShipmentData(files);
      input = parsed;
      hsCodeFromDocs = parsed.hsCode ?? null;
    } else {
      // --- Form mode: validate body as usual ---
      const parsed = shipmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid input",
          details: parsed.error.format(),
        });
      }
      input = parsed.data;
    }

    // 2. HS Code — skip if already found in documents
    const hsCode = hsCodeFromDocs
      ? { hsCode: hsCodeFromDocs, source: "document" }
      : await getHSCode(input.description as string);

    // // 3. Route
    // const route = buildRoute(input.origin, input.destination);

    // // 4. Requirements (rules-based)
    // const requirements = getRequirements({
    //   route,
    //   hsCode,
    //   weight: input.weight,
    // });

    // // 5. Documents validation
    // const validation = validateDocuments(requirements, {
    //   providedDocs: [],
    // });

    // // 6. AI Recommendations
    // const recommendations = await generateRecommendations({
    //   missingDocs: validation.missing,
    //   route,
    //   cargo: input,
    //   hsCode,
    // });

    // // 7. Generate docs
    // const documents = generateDocuments(validation.missing, input);

    // 8. Response
    return res.json({
      input,
      hsCode,
      // route,
      // requirements,
      // validation,
      // recommendations,
      // documents,
    });
  } catch (error) {
    console.error("Process shipment error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
