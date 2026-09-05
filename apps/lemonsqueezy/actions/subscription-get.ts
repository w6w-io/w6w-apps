import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

/** `GET /v1/subscriptions/:id`. */
interface Input {
  subscriptionId: string;
  include?: string;
}

const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Retrieve a single subscription by ID.",
  params: [
    { key: "subscriptionId", label: "Subscription ID", type: "string", required: true },
    includeParam,
  ],
  output: [{ key: "data", type: "object", label: "The Subscription object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
      { query: { include: input.include } },
    );
  },
};

export default subscriptionGet;
