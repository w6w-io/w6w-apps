import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";
import { planIdParam } from "../lib/params.ts";

/** `GET /plans/{id}` — public, no credentials required. */
interface Input {
  planId: string;
}

const planGet: ActionDefinition<Input> = {
  key: "plan-get",
  type: "read",
  resource: "plan",
  title: "Get Plan",
  description: "Retrieve a plan by ID. Public — works even without a live connection.",
  requiresAuth: false,
  params: [planIdParam],
  output: [{ key: "data", type: "object", label: "The plan" }],

  execute(input, ctx) {
    return new WhopClient(ctx).get(`/plans/${encodeURIComponent(input.planId)}`);
  },
};

export default planGet;
