import type { ActionDefinition } from "@w6w/types";
import { ShippoClient, sortRates } from "../lib/client.ts";
import type { Rate } from "../lib/client.ts";

/**
 * `GET /shipments/{id}` — re-read a shipment, most usefully to poll one
 * created with `async: true` until its rates arrive (`status` moves from
 * `QUEUED`/`WAITING` to `SUCCESS`).
 */
const action: ActionDefinition = {
  key: "shipment-get",
  type: "read",
  resource: "shipment",
  title: "Get a shipment",
  description: "Re-read a shipment — poll this after an async shipment-create until rates arrive.",
  params: [
    {
      key: "shipmentId",
      label: "Shipment ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "object_id", type: "string", label: "Shipment ID" },
    { key: "status", type: "string", label: "WAITING · QUEUED · SUCCESS · ERROR" },
    { key: "rates", type: "array", label: "Every carrier's price, cheapest first" },
    { key: "cheapestRate", type: "object", label: "The lowest-priced rate, compared numerically" },
    { key: "rateCount", type: "number", label: "How many carriers quoted" },
  ],

  async execute(input, ctx) {
    const { shipmentId } = input as { shipmentId?: string };
    if (!shipmentId) throw new Error("`shipmentId` is required");

    const shipment = await new ShippoClient(ctx).request<
      { object_id?: string; status?: string; rates?: Rate[] }
    >(`/shipments/${encodeURIComponent(shipmentId)}`);

    const rates = sortRates(shipment?.rates ?? []);
    ctx.log("info", "read a Shippo shipment", {
      shipmentId: shipment?.object_id,
      status: shipment?.status,
      rateCount: rates.length,
    });
    return { ...shipment, rates, cheapestRate: rates[0], rateCount: rates.length };
  },
};

export default action;
