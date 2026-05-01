import { Request, Response } from "express";
import { z } from "zod";

import { getHSCode } from "../services/ai/hsCode";
// import { buildRoute } from "../services/shipment/route";
// import { getRequirements } from "../services/shipment/requirements";
// import { validateDocuments } from "../services/shipment/validation";
// import { generateRecommendations } from "../services/ai/recommendations";
// import { generateDocuments } from "../services/documents/generator";

const shipmentSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  description: z.string().optional(),
  weight: z.number().optional(),
  value: z.number().optional(),
  shipDate: z.string().optional(),

  files: z.any().optional(),
});

export const processShipment = async (req: Request, res: Response) => {
  try {
    // 1. Validate input
    const parsed = shipmentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: parsed.error.format(),
      });
    }

    const input = parsed.data;

    // 2. HS Code 
    const hsCode = await getHSCode(input.description as string);

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