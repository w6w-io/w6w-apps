import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /opportunities` — search by (part of) a name. */
interface Input {
  term?: string;
  pageSize?: number;
  pageToken?: string;
}

interface OpportunitiesPage {
  opportunities: unknown[];
  next_page_token: string | null;
}

const opportunitiesSearch: ActionDefinition<Input> = {
  key: "opportunities-search",
  type: "search",
  resource: "opportunity",
  title: "Search Opportunities",
  description: "Search opportunities by name.",
  params: [{ key: "term", label: "Search term", type: "string" }, ...paginationParams(100)],
  output: [
    { key: "opportunities", type: "array", label: "Opportunities" },
    { key: "next_page_token", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    return new AffinityClient(ctx).json<OpportunitiesPage>("/opportunities", {
      query: compact({
        term: input.term,
        page_size: input.pageSize ?? 100,
        page_token: input.pageToken,
      }),
    });
  },
};

export default opportunitiesSearch;
