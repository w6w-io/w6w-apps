import type { ActionDefinition } from "@w6w/types";
import type { Address } from "../lib/client.ts";
import { compact, json, ShipStationClient } from "../lib/client.ts";

/**
 * `PUT /v2/shipments/{shipment_id}` — update a shipment before you buy a label for it.
 *
 * ShipStation's own example request for this endpoint resends nearly every field the
 * shipment was created with (`docs.shipstation.com/apis/shipengine/docs/reference/
 * update-shipment`), which strongly suggests — though the ShipStation-branded guide
 * does not say so as explicitly as the Sales Order `PUT` does — that this is a
 * **full replace**, not a merge-patch. Run `shipment-get` first and carry its
 * unchanged fields into this call, rather than assuming an omitted field is left alone.
 *
 * Fails once the shipment already has a purchased label — cancel and recreate instead.
 */
const action: ActionDefinition = {
  key: "shipment-update",
  type: "perform",
  resource: "shipment",
  title: "Update a Shipment",
  description:
    "Replace a shipment's details before a label is purchased for it. Treat this as a FULL " +
    "replace — fetch the current shipment first and carry its fields forward.",
  idempotent: true,
  params: [
    { key: "shipmentId", label: "Shipment ID", type: "string", required: true },
    { key: "carrierId", label: "Carrier ID", type: "string", default: "" },
    { key: "serviceCode", label: "Service Code", type: "string", default: "" },
    {
      key: "shipTo",
      label: "Ship To Address",
      type: "json",
      required: true,
      default: "",
    },
    { key: "shipFrom", label: "Ship From Address", type: "json", default: "" },
    { key: "warehouseId", label: "Warehouse ID", type: "string", default: "" },
    {
      key: "packages",
      label: "Packages",
      type: "json",
      default: "",
      hint: 'Array: [{"weight":{"value":16,"unit":"ounce"},"dimensions":{...}}]',
    },
    { key: "externalShipmentId", label: "External Shipment ID", type: "string", default: "" },
    { key: "shipDate", label: "Ship Date", type: "datetime", default: "" },
    {
      key: "confirmation",
      label: "Delivery Confirmation",
      type: "string",
      default: "",
      advanced: true,
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
    if (!shipmentId) throw new Error("`shipmentId` is required");
    const shipTo = json(p.shipTo, "shipTo") as Address | undefined;
    if (!shipTo) throw new Error("`shipTo` is required");
    if (!p.shipFrom && !p.warehouseId) {
      throw new Error("either `shipFrom` or `warehouseId` is required");
    }

    const body = compact({
      carrier_id: p.carrierId,
      service_code: p.serviceCode,
      ship_to: shipTo,
      ship_from: json(p.shipFrom, "shipFrom"),
      warehouse_id: p.warehouseId,
      packages: json(p.packages, "packages"),
      external_shipment_id: p.externalShipmentId,
      ship_date: p.shipDate,
      confirmation: p.confirmation,
    });

    const shipment = await new ShipStationClient(ctx).request<Record<string, unknown>>(
      `/shipments/${encodeURIComponent(shipmentId)}`,
      { method: "PUT", body },
    );
    ctx.log("info", "updated a ShipStation shipment", { shipmentId });
    return {
      ...shipment,
      shipmentId: shipment.shipment_id,
      shipmentStatus: shipment.shipment_status,
    };
  },
};

export default action;
