import type { ActionDefinition } from "@w6w/types";
import { ZuoraClient } from "../lib/client.ts";

interface Input {
  subscriptionKey: string;
}

/**
 * `GET /v1/subscriptions/{subscription-key}` — verified against
 * `developer.zuora.com/v1-api-reference/api/subscriptions/get_subscriptionsbykey`.
 *
 * Retrieves the LATEST version of a subscription. Zuora versions a
 * subscription on every amendment/order action rather than mutating it in
 * place (see `subscription-create.ts`'s note on how "Update a subscription"
 * works) — this always resolves to whichever version is current.
 * `subscription-key` accepts either the subscription's Id or its Name/Number.
 */
const action: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Retrieve the latest version of a subscription by key.",
  params: [
    {
      key: "subscriptionKey",
      label: "Subscription Key",
      type: "string",
      required: true,
      hint: "The subscription's Id or Name.",
    },
  ],
  output: [{ key: "subscription", type: "object", label: "Subscription" }],

  async execute(input, ctx) {
    const client = new ZuoraClient(ctx);
    const subscription = await client.request(
      `/v1/subscriptions/${encodeURIComponent(input.subscriptionKey)}`,
    );
    return { subscription };
  },
};

export default action;
