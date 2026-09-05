import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";
import {
  paginationParams,
  withInteractionDatesParam,
  withInteractionPersonsParam,
  withOpportunitiesParam,
} from "../lib/params.ts";

/**
 * `GET /persons` — search by (part of) an email, first name, or last name.
 * Always answers `{persons, next_page_token}` — unlike `/lists`, this
 * endpoint's envelope shape never varies with the params sent.
 */
interface Input {
  term?: string;
  withInteractionDates?: boolean;
  withInteractionPersons?: boolean;
  withOpportunities?: boolean;
  withCurrentOrganizations?: boolean;
  pageSize?: number;
  pageToken?: string;
}

interface PersonsPage {
  persons: unknown[];
  next_page_token: string | null;
}

const personsSearch: ActionDefinition<Input> = {
  key: "persons-search",
  type: "search",
  resource: "person",
  title: "Search Persons",
  description: "Search people by email, first name, or last name.",
  params: [
    { key: "term", label: "Search term", type: "string" },
    withInteractionDatesParam,
    withInteractionPersonsParam,
    withOpportunitiesParam,
    {
      key: "withCurrentOrganizations",
      label: "Include current organization IDs",
      type: "boolean",
    },
    ...paginationParams(100),
  ],
  output: [
    { key: "persons", type: "array", label: "Persons" },
    { key: "next_page_token", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    return new AffinityClient(ctx).json<PersonsPage>("/persons", {
      query: compact({
        term: input.term,
        with_interaction_dates: input.withInteractionDates,
        with_interaction_persons: input.withInteractionPersons,
        with_opportunities: input.withOpportunities,
        with_current_organizations: input.withCurrentOrganizations,
        page_size: input.pageSize ?? 100,
        page_token: input.pageToken,
      }),
    });
  },
};

export default personsSearch;
