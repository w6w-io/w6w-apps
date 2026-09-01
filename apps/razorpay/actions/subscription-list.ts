import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/subscriptions` — a paginated list of subscriptions. */
interface Input {
  planId?: string;
  count?: number;
  skip?: number;
}

const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "search",
  resource: "subscription",
  title: "List Subscriptions",
  description: "Retrieve subscriptions, optionally filtered by plan.",
  params: [
    { key: "planId", label: "Plan ID", type: "string", hint: "Filter by plan (plan_*)." },
    ...paginationParams(),
  ],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Subscriptions" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/subscriptions",
      compact({ plan_id: input.planId, count: input.count, skip: input.skip }),
    );
  },
};

export default subscriptionList;
