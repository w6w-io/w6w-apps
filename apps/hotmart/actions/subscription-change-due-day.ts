import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, PAYMENTS_PREFIX } from "../lib/client.ts";

/**
 * `PATCH /payments/api/v1/subscriptions/{subscriber_code}` — verified against
 * `developers.hotmart.com/docs/en/v1/subscription/change-due-day/` on
 * 2026-09-05.
 *
 * Only valid for a subscription that is `ACTIVE` or `OVERDUE` (trial
 * subscriptions are rejected — the first charge hasn't happened yet). The
 * new day applies starting the **month after** the next already-scheduled
 * charge, not immediately — the vendor's own example: change on Jan 11 from
 * day 10 to day 5, and the next charge is still Feb 10, with day 5 only
 * taking effect from March. The response body is empty on success.
 */
interface Input {
  subscriberCode: string;
  dueDay: number;
}

const subscriptionChangeDueDay: ActionDefinition<Input> = {
  key: "subscription-change-due-day",
  type: "perform",
  title: "Change Subscription Due Day",
  description:
    "Change the billing day of an active or overdue subscription. Takes effect from the charge " +
    "after the one already scheduled, not immediately.",
  resource: "subscriptions",
  idempotent: false,
  params: [
    { key: "subscriberCode", label: "Subscriber code", type: "string", required: true },
    {
      key: "dueDay",
      label: "New due day",
      type: "number",
      required: true,
      validation: { integer: true, min: 1, max: 31 },
      hint: "1–31. If the current month has fewer days than requested, the last day of that " +
        "month is used instead.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Changed" }],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    await client.json(
      `${PAYMENTS_PREFIX}/subscriptions/${encodeURIComponent(input.subscriberCode)}`,
      { method: "PATCH", body: { due_day: input.dueDay } },
    );
    return { ok: true };
  },
};

export default subscriptionChangeDueDay;
