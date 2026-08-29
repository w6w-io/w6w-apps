import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";
import { planIdParam } from "../lib/params.ts";

/**
 * `DELETE /plans/{id}` — permanently deletes a plan. Existing memberships on
 * this plan are not affected.
 */
interface Input {
  planId: string;
}

const planDelete: ActionDefinition<Input> = {
  key: "plan-delete",
  type: "perform",
  resource: "plan",
  title: "Delete Plan",
  description: "Permanently delete a plan. Existing memberships on it are unaffected.",
  idempotent: true,
  params: [planIdParam],
  output: [
    { key: "id", type: "string", label: "Deleted plan ID" },
    { key: "deleted", type: "boolean", label: "Always true" },
  ],

  execute(input, ctx) {
    return new WhopClient(ctx).delete(`/plans/${encodeURIComponent(input.planId)}`);
  },
};

export default planDelete;
