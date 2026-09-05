import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";
import { chargeIdParam } from "../lib/params.ts";

interface Input {
  chargeId: string;
}

/**
 * `GET /charges/{id}` — retrieve one charge. Scope: `read_orders`.
 * Response envelope: `{"charge": {...}}`.
 *
 * Per the reference, a *processed* charge (`status` `success`, `refunded` or
 * `partially_refunded`) whose `processed_at` is more than 90 days in the past
 * now answers an error rather than the charge — this app surfaces that error
 * as-is rather than papering over it.
 */
const chargeGet: ActionDefinition<Input> = {
  key: "charge-get",
  type: "read",
  resource: "charge",
  title: "Get Charge",
  description: "Retrieve one charge by its Recharge charge id. A processed charge older than " +
    "90 days may no longer be retrievable — see List Charges for details.",
  params: [chargeIdParam],
  output: [
    { key: "id", type: "number", label: "Charge ID" },
    { key: "address_id", type: "number", label: "Address ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "total_price", type: "string", label: "Total price" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "scheduled_at", type: "string", label: "Scheduled at" },
    { key: "processed_at", type: "string", label: "Processed at" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "line_items", type: "array", label: "Line items" },
    { key: "error", type: "string", label: "Processor error (if any)" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(`/charges/${encodeURIComponent(input.chargeId)}`, "charge");
  },
};

export default chargeGet;
