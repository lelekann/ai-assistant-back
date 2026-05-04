import { ShipmentInput } from "../../../types/types";

export const getPackingListData = (input: ShipmentInput) => ({
  title: "PACKING LIST",
  date: input.shipDate ?? new Date().toISOString().split("T")[0],
  fields: [
    { label: "Shipper", value: `Company, ${input.origin ?? "N/A"}` },
    { label: "Consignee", value: `Company, ${input.destination ?? "N/A"}` },
    { label: "Date", value: input.shipDate ?? "N/A" },
  ],
  packages: [
    {
      number: 1,
      description: input.description ?? "N/A",
      grossWeight: input.weight ?? 0,
      netWeight: input.weight ? input.weight * 0.9 : 0,
      dimensions: "N/A",
    },
  ],
  totalGrossWeight: input.weight ?? 0,
  totalNetWeight: input.weight ? input.weight * 0.9 : 0,
});