import { ShipmentInput } from "../../../types/types";

export const getCMRData = (input: ShipmentInput, hsCode: string) => ({
  title: "CMR CONSIGNMENT NOTE",
  fields: [
    { label: "1. Sender", value: `Company from ${input.origin ?? "N/A"}` },
    { label: "2. Consignee", value: `Company to ${input.destination ?? "N/A"}` },
    { label: "3. Place of delivery", value: input.destination ?? "N/A" },
    { label: "4. Place and date of taking over goods", value: `${input.origin ?? "N/A"}, ${input.shipDate ?? new Date().toISOString().split("T")[0]}` },
    { label: "6. Carrier", value: "TBD" },
    { label: "15. Goods description", value: input.description ?? "N/A" },
    { label: "16. HS Code", value: hsCode },
    { label: "17. Gross weight (kg)", value: String(input.weight ?? "N/A") },
    { label: "22. Established in", value: input.origin ?? "N/A" },
    { label: "23. Date", value: input.shipDate ?? new Date().toISOString().split("T")[0] },
  ],
});