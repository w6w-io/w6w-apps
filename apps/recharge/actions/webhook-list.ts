import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";

/**
 * `GET /webhooks` — list webhooks. Per the reference: "Returns all the
 * webhooks of the given store that are owned by the current requesting
 * client (note that a private token shows all of the store's webhooks, an
 * integration token only shows that integration's webhooks)." No scope is
 * documented for this endpoint. Response envelope: `{"webhooks": [...]}`.
 */
const webhookList: ActionDefinition<Record<string, never>> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List webhooks owned by this connection's token. A private (merchant) token " +
    "sees every webhook on the store; an integration token sees only its own.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Webhooks" },
  ],

  async execute(_input, ctx) {
    const client = new RechargeClient(ctx);
    const page = await client.list("/webhooks", "webhooks");
    return { items: page.items };
  },
};

export default webhookList;
