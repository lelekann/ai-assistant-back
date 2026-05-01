export type HSFallbackRule = {
  keywords: string[];
  hsCode: string;
  description: string;
};

export type TMSOrderStatus = "draft" | "in-progress" | "completed" | "cancelled";

export type TMSOrder = {
  id: string;
  orderNumber: string;
  status: TMSOrderStatus;
  route: {
    origin: string;
    destination: string;
    transitCountries: string[];
  };
  shipmentDate: string;
  product: {
    description: string;
    hsCode: string;
  };
  quantity: {
    amount: number;
    unit: string;
  };
  weight: {
    amount: number;
    unit: string;
  };
  declaredValue: {
    amount: number;
    currency: string;
  };
  carrier: {
    name: string;
    truck: string;
    driver: string;
  };
};

export type TMSDocumentStatus = "verified" | "error" | "pending";

export type TMSDocument = {
  id: string;
  name: string;
  uploadDate: string;
  status: TMSDocumentStatus;
  generatedByAI?: boolean;
};

export type ChecklistItemStatus =
  | "required"
  | "conditional"
  | "not-needed"
  | "generated"
  | "checking"
  | "error"
  | "pending";

export type ChecklistItem = {
  id: string;
  name: string;
  status: ChecklistItemStatus;
  note?: string;
};

export type IssueSeverity = "blocker" | "warning" | "info";

export type Issue = {
  id: string;
  severity: IssueSeverity;
  title: string;
  what: string;
  time: string;
  where: string;
  whereLink: string;
  risk: string;
  alternative?: {
    route: string;
    additionalTime: string;
    additionalCost: string;
  };
};

export type CrossCheckField = {
  field: string;
  documentA: string;
  documentB: string;
  valueA: string;
  valueB: string;
  conflict: boolean;
};

export type TransitCountryStatus = "ok" | "issue" | "assumed";

export type TransitCountry = {
  name: string;
  status: TransitCountryStatus;
  requirements: string[];
  note?: string;
};

export type CarrierVerification = {
  status: "ok" | "warning" | "error";
  issues: string[];
};

export type AnalysisResult = {
  checklist: ChecklistItem[];
  issues: Issue[];
  crossCheck: CrossCheckField[];
  transitCountries: TransitCountry[];
  carrierVerification: CarrierVerification;
};

export type ExpiringCertificate = {
  id: string;
  name: string;
  holder: string;
  daysRemaining: number;
  affectedOrders: string[];
  acknowledged: boolean;
};

export type AgentOutput = {
  orderId: string;
  status: "ok" | "warning" | "error";
  summary: string;
  documentChecklist: ChecklistItem[];
  transitCountries: TransitCountry[];
  carrier: CarrierVerification;
  issues: Issue[];
  crossCheck: CrossCheckField[];
  expiringCertificates: ExpiringCertificate[];
};