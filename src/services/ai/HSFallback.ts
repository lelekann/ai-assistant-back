import { HSFallbackRule } from "../../types/types";

export const hsFallbackRules: HSFallbackRule[] = [
  {
    keywords: ["battery", "batteries", "lithium"],
    hsCode: "850760",
    description: "Lithium-ion batteries",
  },
  {
    keywords: ["laptop", "notebook"],
    hsCode: "847130",
    description: "Portable computers",
  },
  {
    keywords: ["phone", "smartphone"],
    hsCode: "851713",
    description: "Mobile phones",
  },
  {
    keywords: ["electronics", "circuit", "chip"],
    hsCode: "854231",
    description: "Electronic integrated circuits",
  },
];