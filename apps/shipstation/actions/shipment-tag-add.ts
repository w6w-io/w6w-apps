import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

/**
 * `POST /v2/shipments/{shipment_id}/tags/{tag_name}` — tag a shipment for later
 * filtering with `shipment-list`/`label-list`. Creates the tag automatically if the
 * name doesn't exist yet.
 */
const action: ActionDefinition = {
  key: "shipment-tag-add",
  type: "perform",
  resource: "shipment",
  title: "Add a Tag to a Shipment",
  description: "Tag a shipment so it can be filtered later. Creates the tag if it doesn't " +
    "already exist.",
  idempotent: true,
  params: [
    { key: "shipmentId", label: "Shipment ID", type: "string", required: true },
    { key: "tagName", label: "Tag Name", type: "string", required: true },
  ],
  output: [
    { key: "shipmentId", type: "string", label: "Shipment ID" },
    { key: "tagName", type: "string", label: "Tag name applied" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipmentId = typeof p.shipmentId === "string" ? p.shipmentId.trim() : "";
    const tagName = typeof p.tagName === "string" ? p.tagName.trim() : "";
    if (!shipmentId) throw new Error("`shipmentId` is required");
    if (!tagName) throw new Error("`tagName` is required");

    await new ShipStationClient(ctx).request(
      `/shipments/${encodeURIComponent(shipmentId)}/tags/${encodeURIComponent(tagName)}`,
      { method: "POST" },
    );
    ctx.log("info", "tagged a ShipStation shipment", { shipmentId, tagName });
    return { shipmentId, tagName };
  },
};

export default action;
