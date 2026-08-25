import type { ActionDefinition } from "@w6w/types";
import type { Address } from "../lib/client.ts";
import { compact, json, ShipStationClient } from "../lib/client.ts";

interface Shipment {
  shipment_id?: string;
  external_shipment_id?: string;
  shipment_status?: string;
  [key: string]: unknown;
}

/**
 * `POST /v2/shipments` — describe what you're shipping. This is what ShipStation's
 * own UI and its deprecated V1 API called an **order**; V2 renamed it **shipment**
 * (see `lib/client.ts` for the full terminology mapping — the V1-sense "shipment",
 * i.e. a purchased label, is `label-create` in this app).
 *
 * This does not buy anything and does not request rates — it creates the record that
 * `rate-get`, `label-create`, and batch operations all key off of via `shipment_id`.
 *
 * `ship_from` may be a full address OR you can pass `warehouseId` instead, which
 * ShipStation resolves to whichever warehouse you've set up (see `warehouse-list`).
 */
const action: ActionDefinition = {
  key: "shipment-create",
  type: "perform",
  resource: "shipment",
  title: "Create a Shipment",
  description:
    "Describe what you're shipping — addresses, package(s), carrier and service. Called an " +
    '"order" in the ShipStation UI and its legacy V1 API. Creates no label and buys nothing.',
  idempotent: false,
  params: [
    {
      key: "carrierId",
      label: "Carrier ID",
      type: "string",
      required: true,
      hint: "From `carrier-list`, e.g. `se-123890`.",
    },
    {
      key: "serviceCode",
      label: "Service Code",
      type: "string",
      required: true,
      hint: "e.g. `usps_priority_mail`, `ups_ground`. See `carrier-get` for a carrier's services.",
    },
    {
      key: "shipTo",
      label: "Ship To Address",
      type: "json",
      required: true,
      default: "",
      hint: '{"name":"…","address_line1":"…","city_locality":"…","state_province":"…",' +
        '"postal_code":"…","country_code":"US","phone":"…"}',
    },
    {
      key: "shipFrom",
      label: "Ship From Address",
      type: "json",
      default: "",
      hint: "Same shape as Ship To. Leave blank if `warehouseId` is set.",
    },
    {
      key: "warehouseId",
      label: "Warehouse ID",
      type: "string",
      default: "",
      hint: "Alternative to `shipFrom` — a warehouse from `warehouse-list`. Exactly one of the " +
        "two is required.",
    },
    {
      key: "packages",
      label: "Packages",
      type: "json",
      required: true,
      default: "",
      hint: 'Array, one entry per package: [{"weight":{"value":16,"unit":"ounce"},' +
        '"dimensions":{"unit":"inch","length":10,"width":8,"height":4}}]. `weight` is required ' +
        "per package; `dimensions` is optional but strongly recommended for accurate rates.",
    },
    {
      key: "externalShipmentId",
      label: "External Shipment ID",
      type: "string",
      default: "",
      hint: "Your own identifier. Must be unique per your account — a duplicate is rejected.",
    },
    {
      key: "shipDate",
      label: "Ship Date",
      type: "datetime",
      default: "",
      hint: "ISO 8601. Defaults to today when omitted.",
    },
    {
      key: "confirmation",
      label: "Delivery Confirmation",
      type: "select",
      default: "none",
      advanced: true,
      options: [
        { label: "None", value: "none" },
        { label: "Delivery", value: "delivery" },
        { label: "Signature", value: "signature" },
        { label: "Adult Signature", value: "adult_signature" },
        {
          label: "Adult Signature (Restricted Delivery)",
          value: "adult_signature_restricted_delivery",
        },
        { label: "Direct Signature (FedEx only)", value: "direct_signature" },
        { label: "Delivery Mailed (UPS only, $2 fee)", value: "delivery_mailed" },
        { label: "Verbal Confirmation", value: "verbal_confirmation" },
        { label: "Delivery Code", value: "delivery_code" },
        { label: "Age Verification 16+", value: "age_verification_16_plus" },
      ],
      hint: "Not every carrier/service supports every value — an unsupported combination is " +
        "rejected by the carrier, not silently ignored.",
    },
    {
      key: "validateAddress",
      label: "Address Validation",
      type: "select",
      default: "no_validation",
      advanced: true,
      options: [
        { label: "No validation", value: "no_validation" },
        { label: "Validate only (error on failure)", value: "validate_only" },
        { label: "Validate and clean", value: "validate_and_clean" },
      ],
    },
    {
      key: "isReturnLabel",
      label: "Return Shipment",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "customs",
      label: "Customs Info",
      type: "json",
      default: "",
      advanced: true,
      hint: "Required for anything crossing a border. Without it, an international shipment is " +
        "created but fails when you try to buy a label for it.",
    },
  ],
  output: [
    {
      key: "shipmentId",
      type: "string",
      label: "Shipment ID — pass it to `rate-get` or `label-create`",
    },
    {
      key: "shipmentStatus",
      type: "string",
      label: "pending | processing | label_purchased | cancelled",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipTo = json(p.shipTo, "shipTo") as Address | undefined;
    const shipFrom = json(p.shipFrom, "shipFrom") as Address | undefined;
    if (!shipTo) throw new Error("`shipTo` is required");
    if (!shipFrom && !p.warehouseId) {
      throw new Error("either `shipFrom` or `warehouseId` is required");
    }
    const packages = json(p.packages, "packages");
    if (!Array.isArray(packages) || packages.length === 0) {
      throw new Error("`packages` must be a non-empty array");
    }

    const body = compact({
      carrier_id: p.carrierId,
      service_code: p.serviceCode,
      ship_to: shipTo,
      ship_from: shipFrom,
      warehouse_id: p.warehouseId,
      packages,
      external_shipment_id: p.externalShipmentId,
      ship_date: p.shipDate,
      confirmation: p.confirmation === "none" ? undefined : p.confirmation,
      validate_address: p.validateAddress === "no_validation" ? undefined : p.validateAddress,
      is_return_label: p.isReturnLabel === true ? true : undefined,
      customs: json(p.customs, "customs"),
    });

    const result = await new ShipStationClient(ctx).request<{ shipments?: Shipment[] }>(
      "/shipments",
      { method: "POST", body: { shipments: [body] } },
    );
    const shipment = result?.shipments?.[0];
    if (!shipment) throw new Error("ShipStation did not return a shipment");

    ctx.log("info", "created a ShipStation shipment", {
      shipmentId: shipment.shipment_id,
      status: shipment.shipment_status,
    });
    return {
      ...shipment,
      shipmentId: shipment.shipment_id,
      shipmentStatus: shipment.shipment_status,
    };
  },
};

export default action;
