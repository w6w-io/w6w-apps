import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/** `GET /v1/pricing_plans/{pricing_plan_id}` — a course's pricing plan. */
interface Input {
  pricingPlanId: number;
}

const pricingPlanGet: ActionDefinition<Input> = {
  key: "pricing-plan-get",
  type: "read",
  resource: "pricing-plan",
  title: "Get Pricing Plan",
  description: "Fetch a specific pricing plan by ID. Currently only supports pricing plans " +
    "associated with courses.",
  params: [
    { key: "pricingPlanId", label: "Pricing Plan ID", type: "number", required: true },
  ],
  output: [
    { key: "pricing_plan", type: "object", label: "Pricing plan" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(`/pricing_plans/${input.pricingPlanId}`);
  },
};

export default pricingPlanGet;
