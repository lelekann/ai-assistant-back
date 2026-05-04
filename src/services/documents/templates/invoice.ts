import { ShipmentInput } from "../../../types/types";

export const getInvoiceData = (input: ShipmentInput, hsCode: string) => ({
  title: "COMMERCIAL INVOICE",
  invoiceNumber: `INV-${Date.now()}`,
  date: input.shipDate ?? new Date().toISOString().split("T")[0],
  fields: [
    { label: "Exporter / Seller", value: `Company, ${input.origin ?? "N/A"}` },
    { label: "Importer / Buyer", value: `Company, ${input.destination ?? "N/A"}` },
    { label: "Country of Origin", value: input.origin ?? "N/A" },
    { label: "Country of Destination", value: input.destination ?? "N/A" },
    { label: "Shipment Date", value: input.shipDate ?? "N/A" },
  ],
  lineItems: [
    {
      description: input.description ?? "N/A",
      hsCode,
      quantity: 1,
      unit: "shipment",
      unitPrice: input.value ?? 0,
      total: input.value ?? 0,
    },
  ],
  totalValue: input.value ?? 0,
  currency: "EUR",
});