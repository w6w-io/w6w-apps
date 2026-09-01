import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { subscriptionIdParam } from "../lib/params.ts";

/** `GET /v1/subscriptions/{id}` — a subscription's full details and current status. */
interface Input {
  id: string;
}

const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Fetch a subscription's full details and current status.",
  params: [subscriptionIdParam()],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "plan_id", type: "string", label: "Plan ID" },
    {
      key: "status",
      type: "string",
      label: "created | authenticated | active | pending | halted | …",
    },
    { key: "current_start", type: "number", label: "Current billing cycle start" },
    { key: "current_end", type: "number", label: "Current billing cycle end" },
    { key: "charge_at", type: "number", label: "Next scheduled charge" },
    { key: "quantity", type: "number", label: "Plan units billed per cycle" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(`/subscriptions/${encodeURIComponent(input.id)}`);
  },
};

export default subscriptionGet;
