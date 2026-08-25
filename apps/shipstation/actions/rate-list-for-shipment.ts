import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

interface Rate {
  rate_id?: string;
  carrier_id?: string;
  service_code?: string;
  shipping_amount?: { currency?: string; amount?: number };
}

interface RateResultEntry {
  shipment_id?: string;
  status?: string;
  rates?: Rate[];
}

/**
 * `GET /v2/shipments/{shipment_id}/rates` — retrieve rates already calculated for a
 * shipment (e.g. by `rate-get` or by a rate request made outside this app), rather
 * than requesting new ones. Read-only and side-effect-free, unlike `rate-get`.
 *
 * Per `docs.shipstation.com/retrieve-rates`, the response is an **array** of rate
 * result objects (one per rate request made against this shipment), each carrying its
 * own `rates` list — not a single flat `rates` array.
 */
const action: ActionDefinition = {
  key: "rate-list-for-shipment",
  type: "read",
  resource: "rate",
  title: "Get Previously Calculated Rates",
  description: "Retrieve rates already calculated for an existing shipment, without requesting " +
    "new ones (no side effect, unlike `rate-get`).",
  params: [
    { key: "shipmentId", label: "Shipment ID", type: "string", required: true },
  ],
  output: [
    {
      key: "rates",
      type: "array",
      label: "Every rate across every rate request for this shipment",
    },
    {
      key: "cheapestRate",
      type: "object",
      label: "The lowest shipping_amount, compared numerically",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const shipmentId = typeof p.shipmentId === "string" ? p.shipmentId.trim() : "";
    if (!shipmentId) throw new Error("`shipmentId` is required");

    const results = await new ShipStationClient(ctx).request<RateResultEntry[]>(
      `/shipments/${encodeURIComponent(shipmentId)}/rates`,
    );
    const rates = (Array.isArray(results) ? results : []).flatMap((r) => r.rates ?? []);
    const sorted = [...rates].sort(
      (a, b) => (a.shipping_amount?.amount ?? Infinity) - (b.shipping_amount?.amount ?? Infinity),
    );
    return { rates: sorted, cheapestRate: sorted[0] };
  },
};

export default action;
