import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";

interface Input {
  opportunityId: number;
}

const opportunityDelete: ActionDefinition<Input> = {
  key: "opportunity-delete",
  type: "perform",
  resource: "opportunity",
  title: "Delete Opportunity",
  description: "Permanently delete an opportunity. Insightly has no trash to recover it from.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InsightlyClient(ctx).request(`/Opportunities/${input.opportunityId}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default opportunityDelete;
