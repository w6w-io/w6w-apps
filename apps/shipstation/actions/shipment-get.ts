import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

/**
 * `GET /v2/shipments/{shipment_id}` or `GET /v2/shipments/external_shipment_id/{id}` —
 * look up one shipment (the V1/UI "order") by either id.
 */
const action: ActionDefinition = {
  key: "shipment-get",
  type: "read",
  resource: "shipment",
  title: "Get a Shipment",
  description: "Look up one shipment by its ShipStation `shipment_id` or by your own " +
    "`externalShipmentId`.",
  params: [
    {
      key: "shipmentId",
      label: "Shipment ID",
      type: "string",
      default: "",
      hint: "e.g. `se-202902255`. Provide this or `externalShipmentId`, not both.",
    },
    {
      key: "externalShipmentId",
      label: "External Shipment ID",
      type: "string",
      default: "",
      hint: "The id you supplied when creating the shipment.",
    },
  ],
  output: [
    { key: "shipmentId", type: "string", label: "Shipment ID" },
    {
      key: "shipmentStatus",
      type: "string",
      label: "pending | processing | label_purchased | cancelled",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipmentId = typeof p.shipmentId === "string" ? p.shipmentId.trim() : "";
    const externalId = typeof p.externalShipmentId === "string" ? p.externalShipmentId.trim() : "";
    if (!shipmentId && !externalId) {
      throw new Error("either `shipmentId` or `externalShipmentId` is required");
    }

    const path = shipmentId
      ? `/shipments/${encodeURIComponent(shipmentId)}`
      : `/shipments/external_shipment_id/${encodeURIComponent(externalId)}`;
    const shipment = await new ShipStationClient(ctx).request<Record<string, unknown>>(path);
    return {
      ...shipment,
      shipmentId: shipment.shipment_id,
      shipmentStatus: shipment.shipment_status,
    };
  },
};

export default action;
