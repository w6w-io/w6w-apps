import type { ActionDefinition } from "@w6w/types";
import type { Address } from "../lib/client.ts";
import { compact, json, ShipStationClient } from "../lib/client.ts";

interface Rate {
  rate_id?: string;
  carrier_id?: string;
  service_code?: string;
  shipping_amount?: { currency?: string; amount?: number };
  delivery_days?: number | null;
}

interface InvalidRate {
  carrier_id?: string;
  service_code?: string;
  error_type?: string;
  error_message?: string;
}

/**
 * The full response is `{ rate_response: { rates, invalid_rates, status, errors }, ...the
 * created shipment's own fields at the TOP level, including a second copy of
 * shipment_id }` — verified against `docs.shipstation.com/rate-shopping`'s "About the
 * Response" sample. `rates` is NOT top-level, which an implementation working only from
 * the abbreviated single-rate examples elsewhere in the same docs would miss entirely.
 */
interface RatesResponse {
  rate_response?: {
    rates?: Rate[];
    invalid_rates?: InvalidRate[];
    status?: string;
    errors?: unknown[];
  };
  shipment_id?: string;
}

/**
 * `POST /v2/rates` — get carrier/service price quotes for a shipment.
 *
 * ## This is a "read" with a side effect
 *
 * Per `docs.shipstation.com/retrieve-rates`, ShipStation stores the shipment details
 * you send here as a real `shipment` record and returns its `shipment_id` alongside
 * the quotes — every call to this "just get me a price" endpoint quietly creates a
 * shipment that will later show up in `shipment-list`. That is why this action is
 * `perform`/non-idempotent rather than `read`, and why `shipmentId` is a top-level
 * output rather than buried in the response — so a workflow author sees it happened.
 *
 * You must supply `carrierIds` — ShipStation only quotes carriers you name.
 */
const action: ActionDefinition = {
  key: "rate-get",
  type: "perform",
  resource: "rate",
  title: "Get Shipping Rates",
  description:
    "Get carrier price quotes for a shipment you describe inline. NOTE: ShipStation stores " +
    "this as a real shipment record as a side effect — see `shipmentId` in the output.",
  idempotent: false,
  params: [
    {
      key: "carrierIds",
      label: "Carrier IDs",
      type: "string",
      required: true,
      hint: "Comma-separated, from `carrier-list`, e.g. `se-123890,se-456789`.",
    },
    { key: "shipTo", label: "Ship To Address", type: "json", required: true, default: "" },
    { key: "shipFrom", label: "Ship From Address", type: "json", default: "" },
    { key: "warehouseId", label: "Warehouse ID", type: "string", default: "" },
    {
      key: "packages",
      label: "Packages",
      type: "json",
      required: true,
      default: "",
      hint: 'Array: [{"weight":{"value":16,"unit":"ounce"},"dimensions":{...}}]',
    },
    {
      key: "serviceCodes",
      label: "Service Codes",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated. Narrows quotes to these services instead of every service the " +
        "named carriers offer.",
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
  ],
  output: [
    { key: "rates", type: "array", label: "Every quoted rate" },
    {
      key: "cheapestRate",
      type: "object",
      label: "The lowest shipping_amount, compared numerically",
    },
    {
      key: "invalidRates",
      type: "array",
      label: "Carriers/services that could not be quoted, and why",
    },
    {
      key: "shipmentId",
      type: "string",
      label: "The shipment ShipStation created as a side effect",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipTo = json(p.shipTo, "shipTo") as Address | undefined;
    if (!shipTo) throw new Error("`shipTo` is required");
    if (!p.shipFrom && !p.warehouseId) {
      throw new Error("either `shipFrom` or `warehouseId` is required");
    }
    const packages = json(p.packages, "packages");
    if (!Array.isArray(packages) || packages.length === 0) {
      throw new Error("`packages` must be a non-empty array");
    }
    const carrierIds = String(p.carrierIds ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (carrierIds.length === 0) throw new Error("`carrierIds` is required");
    const serviceCodes = typeof p.serviceCodes === "string" && p.serviceCodes.trim()
      ? p.serviceCodes.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const result = await new ShipStationClient(ctx).request<RatesResponse>("/rates", {
      method: "POST",
      body: {
        rate_options: compact({ carrier_ids: carrierIds, service_codes: serviceCodes }),
        shipment: compact({
          validate_address: p.validateAddress === "no_validation" ? undefined : p.validateAddress,
          ship_to: shipTo,
          ship_from: json(p.shipFrom, "shipFrom"),
          warehouse_id: p.warehouseId,
          packages,
        }),
      },
    });

    const rates = [...(result?.rate_response?.rates ?? [])].sort(
      (a, b) => (a.shipping_amount?.amount ?? Infinity) - (b.shipping_amount?.amount ?? Infinity),
    );
    const invalidRates = result?.rate_response?.invalid_rates ?? [];
    ctx.log("info", "quoted ShipStation rates", {
      shipmentId: result?.shipment_id,
      rateCount: rates.length,
      invalidCount: invalidRates.length,
    });
    return { rates, cheapestRate: rates[0], invalidRates, shipmentId: result?.shipment_id };
  },
};

export default action;
