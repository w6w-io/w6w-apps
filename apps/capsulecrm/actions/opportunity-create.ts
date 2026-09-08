import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import {
  buildOpportunityBody,
  opportunityFieldParams,
  type OpportunityFieldsInput,
} from "../lib/opportunity.ts";

interface Input extends OpportunityFieldsInput {
  name: string;
  partyId: number;
  milestoneId: number;
}

const opportunityCreate: ActionDefinition<Input> = {
  key: "opportunity-create",
  type: "perform",
  resource: "opportunity",
  title: "Create Opportunity",
  description: "Create a new opportunity (deal). `party` and `milestone` are required by Capsule " +
    "— use Party List/Search and Pipeline List/Milestone List to resolve their ids.",
  idempotent: false,
  params: opportunityFieldParams.map((p) =>
    p.key === "name" || p.key === "partyId" || p.key === "milestoneId"
      ? { ...p, required: true }
      : p
  ),
  output: [{ key: "opportunity", type: "object", label: "Opportunity" }],

  async execute(input, ctx) {
    const { data } = await new CapsuleClient(ctx).request<{ opportunity: unknown }>(
      "/opportunities",
      { method: "POST", body: { opportunity: buildOpportunityBody(input) } },
    );
    return { opportunity: data.opportunity };
  },
};

export default opportunityCreate;
