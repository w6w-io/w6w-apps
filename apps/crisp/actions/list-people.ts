import type { ActionDefinition } from "@w6w/types";
import { compact, CrispClient, PAGE_PARAMS } from "../lib/client.ts";

interface Input {
  pageNumber: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  searchText?: string;
}

export interface CrispPeopleProfileSummary {
  people_id?: string;
  email?: string;
  person?: { nickname?: string; phone?: string };
  segments?: string[];
  created_at?: number;
}

/**
 * `GET /v1/website/{website_id}/people/profiles/{page_number}` — lists
 * people (contact) profiles, 20-50 per page. `search_operator` and
 * `search_filter` (structured filter objects) are left out — see README;
 * `search_text` covers the common "find by name/email" case.
 */
const listPeople: ActionDefinition<Input, CrispPeopleProfileSummary[] | undefined> = {
  key: "list-people",
  type: "search",
  resource: "people",
  title: "List People Profiles",
  description: "List contact (people) profiles in the workspace.",
  params: [
    ...PAGE_PARAMS,
    { key: "perPage", label: "Per page", type: "number", hint: "Between 20 and 50." },
    {
      key: "sortField",
      label: "Sort field",
      type: "string",
      hint: "e.g. `nickname`.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    { key: "searchText", label: "Search text", type: "string" },
  ],
  output: [
    { key: "people_id", type: "string", label: "People ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<CrispPeopleProfileSummary[]>(`/people/profiles/${input.pageNumber}`, {
      query: compact({
        per_page: input.perPage,
        sort_field: input.sortField,
        sort_order: input.sortOrder,
        search_text: input.searchText,
      }),
    });
  },
};

export default listPeople;
