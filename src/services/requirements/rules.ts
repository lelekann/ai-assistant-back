export type Requirement = {
  id: string;
  documentName: string;
  condition: string;
  severity: "blocker" | "warning" | "info";
  processingTime?: string;
  where?: string;
  risk: string;
  alternativeRoute?: {
    description: string;
    additionalTime: string;
    additionalCost: string;
  };
};

export type CountryPairRules = {
  requiredDocs: string[];
  requirements: Requirement[];
};

// Cover popular pairs
export const REQUIREMENTS_DB: Record<string, CountryPairRules> = {
  "NL→ES": {
    requiredDocs: ["CMR", "Commercial Invoice", "Packing List"],
    requirements: [],
  },
  "PL→TR": {
    requiredDocs: ["CMR", "Commercial Invoice", "Packing List", "Phytosanitary Certificate"],
    requirements: [
      {
        id: "phyto-tr",
        documentName: "Phytosanitary Certificate",
        condition: "Required for wooden packaging or plant-based goods",
        severity: "blocker",
        processingTime: "~3 business days",
        where: "Turkish Ministry of Agriculture",
        risk: "2–5 day border hold, fine up to €500",
        alternativeRoute: {
          description: "Poland → via Bulgaria → Turkey",
          additionalTime: "+1 day",
          additionalCost: "+€200",
        },
      },
    ],
  },
  "DE→TR": {
    requiredDocs: ["CMR", "Commercial Invoice", "Packing List", "EUR.1 Certificate"],
    requirements: [
      {
        id: "eur1-tr",
        documentName: "EUR.1 Movement Certificate",
        condition: "Recommended for preferential tariff rates",
        severity: "info",
        processingTime: "1 business day",
        where: "Chamber of Commerce",
        risk: "Standard tariff rates apply without it",
      },
    ],
  },
};

// HS-requirements
export const HS_CODE_RULES: Record<string, Requirement[]> = {
  "8471": [ // notebooks
    {
      id: "adr-lithium",
      documentName: "ADR Transport Declaration",
      condition: "Lithium batteries — ADR Class 9",
      severity: "blocker",
      processingTime: "1 business day",
      where: "Accredited ADR consultant",
      risk: "Fine from €3,000, shipment seizure",
      alternativeRoute: {
        description: "Split into 2 shipments under 200kg threshold",
        additionalTime: "+0 days",
        additionalCost: "+€400",
      },
    },
  ],
  "9503": [ // toys
    {
      id: "ce-toys",
      documentName: "CE Certificate",
      condition: "Required for all toys imported to EU",
      severity: "blocker",
      processingTime: "~5 business days",
      where: "Accredited EU testing laboratory",
      risk: "Goods seized at border",
    },
  ],
};

export const getRequirementsForRoute = (
  origin: string,
  destination: string,
  hsCode: string
): CountryPairRules => {
  const key = `${origin}→${destination}`;
  const routeRules = REQUIREMENTS_DB[key] ?? {
    requiredDocs: ["CMR", "Commercial Invoice", "Packing List"],
    requirements: [],
  };

  const hsPrefix = hsCode.slice(0, 4);
  const hsRequirements = HS_CODE_RULES[hsPrefix] ?? [];

  return {
    ...routeRules,
    requirements: [...routeRules.requirements, ...hsRequirements],
  };
};