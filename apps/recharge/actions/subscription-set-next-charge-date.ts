import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";
import { subscriptionIdParam } from "../lib/params.ts";

interface Input {
  subscriptionId: string;
  date: string;
}

/**
 * `POST /subscriptions/{id}/set_next_charge_date` — reschedule a
 * subscription's next charge. Scope: `write_subscriptions`.
 *
 * If another active subscription on the same address is updated to the same
 * date, the reference documents that both are merged into one new charge
 * with a new id — a downstream step should not assume the charge id it had
 * before this call still exists.
 *
 * Response envelope: `{"subscription": {...}}`. Re-sending the same date is
 * a no-op on the server, so this is safe to retry.
 */
const subscriptionSetNextChargeDate: ActionDefinition<Input> = {
  key: "subscription-set-next-charge-date",
  type: "perform",
  resource: "subscription",
  title: "Set Subscription Next Charge Date",
  description: "Change the date a subscription's next charge is scheduled to run.",
  idempotent: true,
  params: [
    subscriptionIdParam,
    {
      key: "date",
      label: "Next charge date",
      type: "date",
      required: true,
      hint: "If another active subscription on the same address already has this date, both are " +
        "merged into one new charge with a new id.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "next_charge_scheduled_at", type: "string", label: "Next charge scheduled at" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}/set_next_charge_date`,
      "subscription",
      { method: "POST", body: { date: input.date } },
    );
  },
};

export default subscriptionSetNextChargeDate;
