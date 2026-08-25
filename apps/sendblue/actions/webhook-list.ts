import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * `GET /api/account/webhooks` — note no `/v2` here, unlike most of this
 * app's other account-scoped reads. Returns every webhook type Sendblue
 * fires (`receive`, `outbound`, `typing_indicator`, `line_assigned`,
 * `line_blocked`, `call_log`, `contact_created`) plus the `globalSecret`
 * used to verify signatures when a specific webhook has no `secret` of its
 * own.
 */
const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "Get every webhook configured for this account, across all event types.",
  params: [],
  output: [{ key: "webhooks", type: "object", label: "Webhooks by event type" }],

  execute(_input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get("/api/account/webhooks");
  },
};

export default webhookList;
