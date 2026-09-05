import type { ActionDefinition } from "@w6w/types";
import { AffinityClient } from "../lib/client.ts";

/** `GET /webhook` — every webhook subscription on this Affinity instance. */
const webhooksList: ActionDefinition<Record<string, never>> = {
  key: "webhooks-list",
  type: "read",
  resource: "webhook",
  title: "List Webhook Subscriptions",
  description: "Get every webhook subscription on this Affinity instance. Limit of 3 per instance.",
  params: [],
  output: [{ key: "webhooks", type: "array", label: "Webhook subscriptions" }],

  execute(_input, ctx) {
    return new AffinityClient(ctx).json("/webhook");
  },
};

export default webhooksList;
