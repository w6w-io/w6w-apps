import type { ActionDefinition } from "@w6w/types";
import { WorkableClient } from "../lib/client.ts";

/**
 * `GET /subscriptions` — no query parameters documented; returns every
 * subscription registered by this connection's access token.
 */
const webhookSubscriptionList: ActionDefinition = {
  key: "webhook-subscription-list",
  type: "read",
  resource: "webhook",
  title: "List Webhook Subscriptions",
  description:
    "List this connection's registered webhook subscriptions. Required scope: `r_candidates` " +
    "or `r_employees`.",
  params: [],
  output: [{ key: "subscriptions", type: "array", label: "Subscriptions" }],

  execute(_input, ctx) {
    return new WorkableClient(ctx).json("/subscriptions");
  },
};

export default webhookSubscriptionList;
