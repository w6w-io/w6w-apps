import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/pricing_plans` — all pricing plans at the school. */
interface Input {
  page?: number;
  per?: number;
}

const pricingPlanList: ActionDefinition<Input> = {
  key: "pricing-plan-list",
  type: "read",
  resource: "pricing-plan",
  title: "List Pricing Plans",
  description: "Fetch all the pricing plans at your school.",
  params: [
    // This operation's own OpenAPI description says the default is 5, per
    // page, when `per` is left unset — the smallest of the three conflicting
    // numbers this API documents. See lib/client.ts.
    ...paginationParams(5, "Teachable's own docs say the default here is 5 when unset."),
  ],
  output: [
    { key: "pricing_plans", type: "array", label: "Pricing plans" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json("/pricing_plans", {
      query: { page: input.page, per: input.per ?? 5 },
    });
  },
};

export default pricingPlanList;
