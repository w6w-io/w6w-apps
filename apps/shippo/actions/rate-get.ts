import type { ActionDefinition } from "@w6w/types";
import { ShippoClient } from "../lib/client.ts";

/**
 * `GET /rates/{id}` — re-read a single rate by id.
 *
 * Rates returned from `shipment-create` are only valid for a few days before
 * pricing may have changed — Shippo's own docs note only rates less than 7
 * days old can be purchased. This re-reads one to confirm it is still the
 * rate you think before passing it to `transaction-create`.
 */
const action: ActionDefinition = {
  key: "rate-get",
  type: "read",
  resource: "rate",
  title: "Get a rate",
  description: "Re-read a single rate by id, e.g. to confirm it before purchasing a label.",
  params: [
    { key: "rateId", label: "Rate ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "object_id", type: "string", label: "Rate ID" },
    { key: "provider", type: "string", label: "Carrier" },
    { key: "amount", type: "string", label: "Price" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "estimated_days", type: "number", label: "Estimated transit days" },
  ],

  async execute(input, ctx) {
    const { rateId } = input as { rateId?: string };
    if (!rateId) throw new Error("`rateId` is required");

    const rate = await new ShippoClient(ctx).request(`/rates/${encodeURIComponent(rateId)}`) as {
      object_id?: string;
      provider?: string;
    };
    ctx.log("info", "read a Shippo rate", { rateId: rate?.object_id, provider: rate?.provider });
    return rate;
  },
};

export default action;
