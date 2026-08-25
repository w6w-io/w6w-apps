import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

/**
 * `GET /v2/shipments/{shipment_id}/cancel` — cancel a shipment record.
 *
 * Yes, `GET`, not `DELETE` or `POST` — verified against `docs.shipstation.com/
 * cancel-shipments`, which shows exactly `GET /v2/shipments/:shipment_id/cancel` in
 * its sample request, and confirmed live: the path answers `401` unauthenticated
 * rather than `404`/`405`, so the route genuinely exists at that method. A client
 * built by pattern-matching this app's other mutations onto `POST` will get a `404`.
 *
 * Requires any label already purchased for the shipment to be voided first
 * (`label-void`) — ShipStation refuses to cancel a shipment with a live label.
 */
const action: ActionDefinition = {
  key: "shipment-cancel",
  type: "perform",
  resource: "shipment",
  title: "Cancel a Shipment",
  description:
    "Cancel a shipment record. If a label was already purchased for it, void that label first " +
    "— ShipStation refuses to cancel a shipment with a live label.",
  idempotent: true,
  params: [
    { key: "shipmentId", label: "Shipment ID", type: "string", required: true },
  ],
  output: [
    { key: "cancelled", type: "boolean", label: "Whether the cancellation succeeded" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipmentId = typeof p.shipmentId === "string" ? p.shipmentId.trim() : "";
    if (!shipmentId) throw new Error("`shipmentId` is required");

    // 204 No Content on success — the client returns undefined for that, which is
    // exactly what we want here.
    await new ShipStationClient(ctx).request(`/shipments/${encodeURIComponent(shipmentId)}/cancel`);
    ctx.log("info", "cancelled a ShipStation shipment", { shipmentId });
    return { cancelled: true };
  },
};

export default action;
