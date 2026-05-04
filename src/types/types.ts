export type HSFallbackRule = {
  keywords: string[];
  hsCode: string;
  description: string;
};

export type ShipmentInput = {
  origin?: string;
  destination?: string;
  description?: string;
  weight?: number;
  value?: number;
  shipDate?: string;
};

export type GeneratedDocument = {
  id: string;
  name: string;
  status: "generated";
  base64: string;       
  filename: string;
};

export type TransitCountry = {
  code: string;
  name: string;
  flag: string;
  status: "ok" | "issue" | "assumed";
  issueDescription?: string;
  borderCrossing?: string;
};