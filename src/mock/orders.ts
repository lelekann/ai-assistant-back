import { AgentOutput, ExpiringCertificate, TMSDocument, TMSOrder } from "../types/types";

export const mockOrders: TMSOrder[] = [
  {
    id: "1",
    orderNumber: "TMS-2024-4471",
    status: "in-progress",
    route: {
      origin: "Germany",
      destination: "Turkey",
      transitCountries: [],
    },
    shipmentDate: "2026-06-11",
    product: {
      description: "Computers",
      hsCode: "847100",
    },
    quantity: {
      amount: 500,
      unit: "pcs",
    },
    weight: {
      amount: 300,
      unit: "kg",
    },
    declaredValue: {
      amount: 10000,
      currency: "EUR",
    },
    carrier: {
      name: "DB Schenker",
      truck: "DAF XG+",
      driver: "J. Kowalski",
    },
  },
];

export const mockDocuments: Record<string, TMSDocument[]> = {
  "1": [
    {
      id: "doc-1",
      name: "CMR_Consignment_Note.pdf",
      uploadDate: "2025-05-12",
      status: "pending",
      generatedByAI: false,
    },
    {
      id: "doc-2",
      name: "Commercial_Invoice.pdf",
      uploadDate: "2025-05-12",
      status: "pending",
      generatedByAI: false,
    },
    {
      id: "doc-3",
      name: "Packing_List.pdf",
      uploadDate: "2025-05-11",
      status: "pending",
      generatedByAI: false,
    },
  ],
};

export const mockDocumentFiles: Record<string, string> = {
  "doc-1": "src/storage/TMS-2024-4471/original/CMR_Consignment_Note.pdf",
  "doc-2": "src/storage/TMS-2024-4471/original/Commercial_Invoice.pdf",
  "doc-3": "src/storage/TMS-2024-4471/original/Packing_List.pdf",
};

export const mockAgentOutput: Record<string, AgentOutput> = {
  "1": {
    orderId: "1",
    status: "error",
    summary:
      "Shipment TMS-2024-4471 has critical compliance issues that must be resolved before departure. TIR Carnet is missing for Bulgarian transit, and a unit-of-measure mismatch was detected across documents.",
    documentChecklist: [
      { id: "cl-001", name: "CMR Draft", status: "error", note: "Unit of measure mismatch — must match Commercial Invoice" },
      { id: "cl-002", name: "Commercial Invoice", status: "error", note: "Quantity unit inconsistent with CMR Draft" },
      { id: "cl-003", name: "Packing List", status: "pending" },
      { id: "cl-004", name: "TIR Carnet", status: "required", note: "Required for Bulgaria non-EU transit" },
      { id: "cl-005", name: "EUR.1 Movement Certificate", status: "conditional", note: "Required for preferential tariff rates" },
    ],
    issues: [
      {
        id: "iss-001",
        severity: "blocker",
        title: "TIR Carnet Missing",
        what: "TIR carnet is required for Bulgarian transit but the vehicle is not registered in the TIR system.",
        time: "Before departure on 2025-05-14",
        where: "Kapitan Andreevo border crossing, Bulgaria",
        whereLink: "https://maps.google.com/?q=Kapitan+Andreevo+border+crossing",
        risk: "Shipment will be stopped at the Bulgarian border and turned back.",
        alternative: {
          route: "Re-route via Romania → Serbia → North Macedonia → Greece → Spain (ferry)",
          additionalTime: "+2 days",
          additionalCost: "+€420",
        },
      },
      {
        id: "iss-002",
        severity: "warning",
        title: "ADR Certificate Expiring Soon",
        what: "ADR certificate for driver J. Kowalski expires 22 May 2025 — before the shipment date.",
        time: "Expires 22 May 2025",
        where: "Carrier: DB Schenker / Driver: J. Kowalski",
        whereLink: "",
        risk: "Driver may be prohibited from transporting regulated goods after expiry.",
      },
      {
        id: "iss-003",
        severity: "warning",
        title: "Unit of Measure Mismatch",
        what: "CMR Draft uses 'pcs' while Commercial Invoice uses 'pieces' — documents must be consistent.",
        time: "Detected during document cross-check",
        where: "CMR Draft vs. Commercial Invoice",
        whereLink: "",
        risk: "Customs clearance may be delayed or rejected due to inconsistent documentation.",
      },
    ],
    crossCheck: [
      {
        field: "quantity.unit",
        documentA: "Commercial Invoice",
        documentB: "CMR Draft",
        valueA: "pieces",
        valueB: "pcs",
        conflict: true,
      },
      {
        field: "declaredValue.amount",
        documentA: "Commercial Invoice",
        documentB: "Packing List",
        valueA: "8000",
        valueB: "8000",
        conflict: false,
      },
    ],
    transitCountries: [
      { name: "Czech Republic", status: "ok" },
      { name: "Slovakia", status: "ok" },
      { name: "Hungary", status: "assumed", note: "Route through Hungary is assumed — confirm with carrier" },
      { name: "Romania", status: "ok" },
      {
        name: "Bulgaria",
        status: "issue",
        requirements: ["TIR Carnet"],
        note: "TIR carnet required for non-EU transit. Vehicle not registered in TIR system. Border crossing: Kapitan Andreevo.",
      },
    ],
    carrier: {
      status: "warning",
      issues: ["ADR certificate for J. Kowalski expires 22 May — renewal required before shipment date of 2025-05-14"],
    },
    expiringCertificates: [
      {
        id: "cert-1",
        name: "ADR Certificate",
        holder: "J. Kowalski (Driver)",
        daysRemaining: 8,
        affectedOrders: ["TMS-2024-4471"],
        acknowledged: false,
      },
    ],
  },
};

export const mockCertificates: ExpiringCertificate[] = [
  {
    id: "cert-1",
    name: "ADR Certificate",
    holder: "J. Kowalski (Driver)",
    daysRemaining: 10,
    affectedOrders: ["TMS-2024-4471", "TMS-2024-4472"],
    acknowledged: false,
  },
  {
    id: "cert-2",
    name: "Cargo Insurance Policy",
    holder: "DB Schenker",
    daysRemaining: 5,
    affectedOrders: ["TMS-2024-4471"],
    acknowledged: false,
  },
];
