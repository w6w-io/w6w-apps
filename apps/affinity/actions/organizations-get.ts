import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";
import { organizationIdPathParam, withOpportunitiesParam } from "../lib/params.ts";

/** `GET /organizations/{organization_id}`. */
interface Input {
  organizationId: number;
  withInteractionDates?: boolean;
  withInteractionPersons?: boolean;
  withOpportunities?: boolean;
}

const organizationsGet: ActionDefinition<Input> = {
  key: "organizations-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Fetch one organization, including its list entries.",
  params: [
    organizationIdPathParam,
    { key: "withInteractionDates", label: "Include interaction dates", type: "boolean" },
    {
      key: "withInteractionPersons",
      label: "Include interaction persons",
      type: "boolean",
      hint: "Requires 'Include interaction dates'.",
    },
    withOpportunitiesParam,
  ],
  output: [{ key: "id", type: "number", label: "Organization ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/organizations/${input.organizationId}`, {
      query: compact({
        with_interaction_dates: input.withInteractionDates,
        with_interaction_persons: input.withInteractionPersons,
        with_opportunities: input.withOpportunities,
      }),
    });
  },
};

export default organizationsGet;
