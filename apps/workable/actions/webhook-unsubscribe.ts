import type { ActionDefinition } from "@w6w/types";
import { WorkableClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const webhookUnsubscribe: ActionDefinition<Input> = {
  key: "webhook-unsubscribe",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook Subscription",
  description: "Unsubscribe from an event. Required scope: `r_candidates` or `r_employees`.",
  idempotent: true,
  params: [
    { key: "id", label: "Subscription ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (200 on success)" }],

  execute(input, ctx) {
    return new WorkableClient(ctx).status(`/subscriptions/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default webhookUnsubscribe;
