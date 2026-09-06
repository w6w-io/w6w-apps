import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import {
  buildOpportunityBody,
  opportunityFieldParams,
  type OpportunityFieldsInput,
} from "../lib/opportunity.ts";

interface Input extends OpportunityFieldsInput {
  opportunityId: number;
}

const opportunityUpdate: ActionDefinition<Input> = {
  key: "opportunity-update",
  type: "perform",
  resource: "opportunity",
  title: "Update Opportunity",
  description: "Change an existing opportunity. Only the fields you set are touched.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
    ...opportunityFieldParams,
  ],
  output: [{ key: "opportunity", type: "object", label: "Opportunity" }],

  async execute(input, ctx) {
    const { data } = await new CapsuleClient(ctx).request<{ opportunity: unknown }>(
      `/opportunities/${input.opportunityId}`,
      { method: "PUT", body: { opportunity: buildOpportunityBody(input) } },
    );
    return { opportunity: data.opportunity };
  },
};

export default opportunityUpdate;
