import type { ActionDefinition } from "@w6w/types";
import { WealthboxClient } from "../lib/client.ts";

interface Input {
  opportunityId: number;
}

/**
 * `DELETE /v1/opportunities/{id}` — delete an Opportunity. Destructive and
 * irreversible via the API.
 *
 * Idempotent in the sense that matters for retries: deleting an
 * already-deleted Opportunity converges on the same end state.
 */
const deleteOpportunity: ActionDefinition<Input> = {
  key: "delete-opportunity",
  type: "perform",
  resource: "opportunity",
  title: "Delete Opportunity",
  description: "Delete an Opportunity. Destructive and irreversible.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    ctx.log("warn", "deleting opportunity", { opportunityId: input.opportunityId });
    await new WealthboxClient(ctx).request(
      `/opportunities/${encodeURIComponent(input.opportunityId)}`,
      { method: "DELETE" },
    );
    return {};
  },
};

export default deleteOpportunity;
