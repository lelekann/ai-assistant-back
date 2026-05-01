import { ExpiringCertificate, TMSDocument, TMSOrder } from "../types/types";

export const mockOrders: TMSOrder[] = [
  {
    id: "1",
    orderNumber: "TMS-2024-4471",
    status: "in-progress",
    route: {
      origin: "Ukraine",
      destination: "Spain",
      transitCountries: [],
    },
    shipmentDate: "2025-05-14",
    product: {
      description: "Computers",
      hsCode: "847141",
    },
    quantity: {
      amount: 500,
      unit: "pcs",
    },
    weight: {
      amount: 820,
      unit: "kg",
    },
    declaredValue: {
      amount: 8000,
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
      name: "CMR Draft.pdf",
      uploadDate: "2025-05-12",
      status: "error",
      generatedByAI: false,
    },
    {
      id: "doc-2",
      name: "Commercial Invoice.pdf",
      uploadDate: "2025-05-12",
      status: "error",
      generatedByAI: false,
    },
    {
      id: "doc-3",
      name: "Packing List.pdf",
      uploadDate: "2025-05-11",
      status: "error",
      generatedByAI: false,
    },
  ],
};

export const mockDocumentFiles: Record<string, string> = {
  "doc-1": "src/storage/TMS-2024-4471/original/CMR.png",
  "doc-2": "src/storage/TMS-2024-4471/original/image.png",
  "doc-3": "src/storage/TMS-2024-4471/original/packing_list.png",
};

// export const mockAnalysis: Record<string, AnalysisResult> = {
//   "1": {
//     checklist: [
//       { id: "cl-001", name: "CMR Draft", status: "error", note: "Unit of measure mismatch" },
//       { id: "cl-002", name: "Commercial Invoice", status: "error", note: "Quantity unit inconsistent" },
//       { id: "cl-003", name: "Packing List", status: "pending" },
//       { id: "cl-004", name: "TIR Carnet", status: "required", note: "Required for Bulgaria non-EU transit" },
//       { id: "cl-005", name: "EUR.1 Movement Certificate", status: "conditional", note: "Required for preferential tariff" },
//     ],
//     issues: [
//       {
//         id: "iss-001",
//         severity: "blocker",
//         message: "TIR carnet required for Bulgarian transit — vehicle not registered in TIR system. Border crossing: Kapitan Andreevo.",
//       },
//       {
//         id: "iss-002",
//         severity: "warning",
//         message: "ADR certificate for driver J. Kowalski expires 22 May — renewal required before shipment date.",
//       },
//       {
//         id: "iss-003",
//         severity: "warning",
//         message: "CMR Draft: unit of measure is 'pcs' but Commercial Invoice uses 'pieces' — documents must be consistent.",
//         documentId: "doc-1",
//         field: "quantity.unit",
//       },
//     ],
//     crossCheck: [
//       {
//         field: "quantity.unit",
//         documentA: "Commercial Invoice",
//         documentB: "CMR Draft",
//         valueA: "pieces",
//         valueB: "pcs",
//         conflict: true,
//       },
//       {
//         field: "declaredValue.amount",
//         documentA: "Commercial Invoice",
//         documentB: "Packing List",
//         valueA: "8000",
//         valueB: "8000",
//         conflict: false,
//       },
//     ],
//     transitCountries: [
//       { name: "Czech Republic", status: "ok", requirements: [] },
//       { name: "Slovakia", status: "ok", requirements: [] },
//       { name: "Hungary", status: "assumed", requirements: [] },
//       { name: "Romania", status: "ok", requirements: [] },
//       {
//         name: "Bulgaria",
//         status: "issue",
//         requirements: ["TIR carnet"],
//         note: "TIR carnet required for non-EU transit. Vehicle not registered in TIR system. Border crossing: Kapitan Andreevo.",
//       },
//     ],
//     carrierVerification: {
//       status: "warning",
//       issues: ["ADR certificate expires 22 May — renewal required before shipment date of 2025-05-14"],
//     },
//   },
// };

export const mockCertificates: ExpiringCertificate[] = [
  {
    id: "cert-1",
    name: "ADR Certificate",
    holder: "J. Kowalski (Driver)",
    daysRemaining: 45,
    affectedOrders: ["TMS-2024-4471", "TMS-2024-4472"],
    acknowledged: false,
  },
  {
    id: "cert-2",
    name: "Cargo Insurance Policy",
    holder: "DB Schenker",
    daysRemaining: 50,
    affectedOrders: ["TMS-2024-4471"],
    acknowledged: false,
  },
];
