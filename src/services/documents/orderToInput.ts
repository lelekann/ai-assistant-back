import { TMSOrder, ShipmentInput } from "../../types/types";

export function orderToInput(order: TMSOrder): ShipmentInput {
  return {
    origin: order.route.origin,
    destination: order.route.destination,
    description: order.product.description,
    weight: order.weight.amount,
    value: order.declaredValue?.amount,
    shipDate: order.shipmentDate,
  };
}
