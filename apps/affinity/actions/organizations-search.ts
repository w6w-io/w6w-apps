import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";
import {
  paginationParams,
  withInteractionDatesParam,
  withInteractionPersonsParam,
  withOpportunitiesParam,
} from "../lib/params.ts";

/**
 * `GET /organizations` — search by (part of) a name or domain. The docs note
 * this also searches Affinity's *global* organization database, not just
 * this team's own records.
 */
interface Input {
  term?: string;
  withInteractionDates?: boolean;
  withInteractionPersons?: boolean;
  withOpportunities?: boolean;
  pageSize?: number;
  pageToken?: string;
}

interface OrganizationsPage {
  organizations: unknown[];
  next_page_token: string | null;
}

const organizationsSearch: ActionDefinition<Input> = {
  key: "organizations-search",
  type: "search",
  resource: "organization",
  title: "Search Organizations",
  description:
    "Search organizations by name or domain. Also searches Affinity's global organization " +
    "database, not just records your team created.",
  params: [
    { key: "term", label: "Search term", type: "string" },
    withInteractionDatesParam,
    withInteractionPersonsParam,
    withOpportunitiesParam,
    ...paginationParams(100),
  ],
  output: [
    { key: "organizations", type: "array", label: "Organizations" },
    { key: "next_page_token", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    return new AffinityClient(ctx).json<OrganizationsPage>("/organizations", {
      query: compact({
        term: input.term,
        with_interaction_dates: input.withInteractionDates,
        with_interaction_persons: input.withInteractionPersons,
        with_opportunities: input.withOpportunities,
        page_size: input.pageSize ?? 100,
        page_token: input.pageToken,
      }),
    });
  },
};

export default organizationsSearch;
