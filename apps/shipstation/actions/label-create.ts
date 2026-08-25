import type { ActionDefinition } from "@w6w/types";
import type { Address } from "../lib/client.ts";
import { compact, json, ShipStationClient } from "../lib/client.ts";

/**
 * Purchase a shipping label. This is what the ShipStation UI and its legacy V1 API
 * call a **shipment** (see `lib/client.ts` for the full terminology mapping) — money
 * moves the moment this succeeds against a production API key.
 *
 * ## Three different endpoints, not one endpoint with optional fields
 *
 * Verified against `docs.shipstation.com/create-labels` — ShipStation exposes label
 * creation as three **separate URLs**, picked by which id you already have:
 *
 * | You have | Endpoint |
 * |---|---|
 * | Nothing yet | `POST /v2/labels` — full inline shipment details |
 * | A `rate_id` (from `rate-get`) | `POST /v2/labels/rates/{rate_id}` |
 * | A `shipment_id` (from `shipment-create`) | `POST /v2/labels/shipment/{shipment_id}` |
 *
 * This action picks the right one from which id you supply, rather than exposing
 * three separate actions for what is conceptually one operation.
 */
const action: ActionDefinition = {
  key: "label-create",
  type: "perform",
  resource: "label",
  title: "Create (Buy) a Label",
  description:
    "Purchase a shipping label — from a rate id, a shipment id, or full inline shipment " +
    'details. Called a "shipment" in the ShipStation UI and its legacy V1 API. THIS SPENDS ' +
    "MONEY on a production API key.",
  idempotent: false,
  params: [
    {
      key: "rateId",
      label: "Rate ID",
      type: "string",
      default: "",
      hint: "From `rate-get`. If set, this creates the label from that quoted rate — the other " +
        "shipment fields below are ignored.",
    },
    {
      key: "shipmentId",
      label: "Shipment ID",
      type: "string",
      default: "",
      hint: "From `shipment-create`. If set (and `rateId` is not), the label is created from " +
        "that shipment's own carrier/service/addresses — the fields below are ignored.",
    },
    {
      key: "carrierId",
      label: "Carrier ID",
      type: "string",
      default: "",
      hint: "Required only when neither `rateId` nor `shipmentId` is set.",
    },
    { key: "serviceCode", label: "Service Code", type: "string", default: "" },
    { key: "shipTo", label: "Ship To Address", type: "json", default: "" },
    { key: "shipFrom", label: "Ship From Address", type: "json", default: "" },
    { key: "warehouseId", label: "Warehouse ID", type: "string", default: "" },
    {
      key: "packages",
      label: "Packages",
      type: "json",
      default: "",
      hint: 'Array: [{"weight":{"value":16,"unit":"ounce"},"dimensions":{...}}]',
    },
    {
      key: "labelFormat",
      label: "Label Format",
      type: "select",
      default: "pdf",
      options: [
        { label: "PDF", value: "pdf" },
        { label: "PNG", value: "png" },
        { label: "ZPL", value: "zpl" },
      ],
    },
    {
      key: "labelLayout",
      label: "Label Layout",
      type: "select",
      default: "4x6",
      options: [
        { label: "4x6", value: "4x6" },
        { label: "Letter (8.5x11)", value: "letter" },
      ],
    },
    {
      key: "labelDownloadType",
      label: "Download Type",
      type: "select",
      default: "url",
      advanced: true,
      options: [
        { label: "URL (default)", value: "url" },
        { label: "Inline (embed the label file in the response)", value: "inline" },
      ],
    },
    {
      key: "isReturnLabel",
      label: "Return Label",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Domestic only — ShipStation does not support return labels for international " +
        "shipments.",
    },
    {
      key: "chargeEvent",
      label: "Return Label Charge Event",
      type: "select",
      default: "carrier_default",
      advanced: true,
      options: [
        { label: "On Creation", value: "on_creation" },
        { label: "On Carrier Acceptance", value: "on_carrier_acceptance" },
        { label: "Carrier Default", value: "carrier_default" },
      ],
      hint: "Only meaningful when `isReturnLabel` is set.",
    },
  ],
  output: [
    { key: "labelId", type: "string", label: "Label ID — use with `label-void`" },
    { key: "shipmentId", type: "string", label: "The underlying shipment id" },
    { key: "trackingNumber", type: "string", label: "Carrier tracking number" },
    { key: "shipmentCost", type: "object", label: "{currency, amount} charged for the label" },
    {
      key: "labelDownload",
      type: "object",
      label: "{pdf, png, zpl, href} download URLs (valid 90 days)",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const rateId = typeof p.rateId === "string" ? p.rateId.trim() : "";
    const shipmentId = typeof p.shipmentId === "string" ? p.shipmentId.trim() : "";

    const commonOptions = compact({
      label_format: p.labelFormat === "pdf" ? undefined : p.labelFormat,
      label_layout: p.labelLayout === "4x6" ? undefined : p.labelLayout,
      label_download_type: p.labelDownloadType === "url" ? undefined : p.labelDownloadType,
      is_return_label: p.isReturnLabel === true ? true : undefined,
      charge_event: p.isReturnLabel === true && p.chargeEvent !== "carrier_default"
        ? p.chargeEvent
        : undefined,
    });

    const client = new ShipStationClient(ctx);
    let label: Record<string, unknown>;

    if (rateId) {
      label = await client.request(`/labels/rates/${encodeURIComponent(rateId)}`, {
        method: "POST",
        body: commonOptions,
      });
    } else if (shipmentId) {
      label = await client.request(`/labels/shipment/${encodeURIComponent(shipmentId)}`, {
        method: "POST",
        body: commonOptions,
      });
    } else {
      const shipTo = json(p.shipTo, "shipTo") as Address | undefined;
      if (!shipTo) {
        throw new Error("`shipTo` is required when creating a label from inline details");
      }
      if (!p.shipFrom && !p.warehouseId) {
        throw new Error("either `shipFrom` or `warehouseId` is required");
      }
      const packages = json(p.packages, "packages");
      if (!Array.isArray(packages) || packages.length === 0) {
        throw new Error("`packages` must be a non-empty array");
      }
      if (!p.carrierId || !p.serviceCode) {
        throw new Error(
          "`carrierId` and `serviceCode` are required when creating a label from " +
            "inline shipment details",
        );
      }
      label = await client.request("/labels", {
        method: "POST",
        body: {
          ...commonOptions,
          shipment: compact({
            carrier_id: p.carrierId,
            service_code: p.serviceCode,
            ship_to: shipTo,
            ship_from: json(p.shipFrom, "shipFrom"),
            warehouse_id: p.warehouseId,
            packages,
          }),
        },
      });
    }

    ctx.log("info", "purchased a ShipStation label", {
      labelId: label.label_id,
      shipmentId: label.shipment_id,
      carrierCode: label.carrier_code,
    });
    return {
      ...label,
      labelId: label.label_id,
      trackingNumber: label.tracking_number,
      shipmentCost: label.shipment_cost,
      labelDownload: label.label_download,
    };
  },
};

export default action;
