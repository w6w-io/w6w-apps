import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";

interface Input {
  opportunityId: number;
}

const opportunityDelete: ActionDefinition<Input> = {
  key: "opportunity-delete",
  type: "perform",
  resource: "opportunity",
  title: "Delete Opportunity",
  description: "Permanently delete an opportunity from Capsule.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new CapsuleClient(ctx).request(`/opportunities/${input.opportunityId}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default opportunityDelete;
