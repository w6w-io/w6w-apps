import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";
import {
  personIdPathParam,
  withInteractionDatesParam,
  withInteractionPersonsParam,
  withOpportunitiesParam,
} from "../lib/params.ts";

/** `GET /persons/{person_id}`. */
interface Input {
  personId: number;
  withInteractionDates?: boolean;
  withInteractionPersons?: boolean;
  withOpportunities?: boolean;
  withCurrentOrganizations?: boolean;
}

const personsGet: ActionDefinition<Input> = {
  key: "persons-get",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Fetch one person, including their list entries.",
  params: [
    personIdPathParam,
    withInteractionDatesParam,
    withInteractionPersonsParam,
    withOpportunitiesParam,
    {
      key: "withCurrentOrganizations",
      label: "Include current organization IDs",
      type: "boolean",
    },
  ],
  output: [{ key: "id", type: "number", label: "Person ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/persons/${input.personId}`, {
      query: compact({
        with_interaction_dates: input.withInteractionDates,
        with_interaction_persons: input.withInteractionPersons,
        with_opportunities: input.withOpportunities,
        with_current_organizations: input.withCurrentOrganizations,
      }),
    });
  },
};

export default personsGet;
