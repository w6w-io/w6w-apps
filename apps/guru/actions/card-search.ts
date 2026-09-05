import type { ActionDefinition } from "@w6w/types";
import { GuruClient, stripTokens } from "../lib/client.ts";
import {
  cardSearchQueryTypeOptions,
  cardSortFieldOptions,
  pageTokenParam,
  sortOrderOptions,
} from "../lib/params.ts";

/**
 * `GET /api/v1/search/cardmgr` — full-text search over Cards.
 *
 * Returns at most 50 Cards per call (Guru's own ceiling, not configurable via
 * a `limit`-style param the vendor documents as a maximum — `maxResults` is
 * accepted but Guru's description only promises "a maximum of 50"). Page
 * further with the `nextToken` this action returns, fed back as `token`.
 */
interface Input {
  q?: string;
  searchTerms?: string;
  queryType?: string;
  showArchived?: boolean;
  maxResults?: number;
  sortField?: string;
  sortOrder?: string;
  token?: string;
}

const cardSearch: ActionDefinition<Input> = {
  key: "card-search",
  type: "search",
  resource: "card",
  title: "Search Cards",
  description: "Full-text search over Cards. Returns at most 50 per call — page with nextToken.",
  params: [
    { key: "q", label: "Query", type: "string", hint: "Free-text search query." },
    {
      key: "searchTerms",
      label: "Search terms",
      type: "string",
      advanced: true,
    },
    {
      key: "queryType",
      label: "Query type",
      type: "select",
      options: cardSearchQueryTypeOptions,
      advanced: true,
    },
    {
      key: "showArchived",
      label: "Include archived",
      type: "boolean",
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      validation: { integer: true, min: 1 },
      advanced: true,
      hint: "Guru caps a single page at 50 regardless of this value.",
    },
    {
      key: "sortField",
      label: "Sort field",
      type: "select",
      options: cardSortFieldOptions,
      advanced: true,
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: sortOrderOptions,
      advanced: true,
    },
    pageTokenParam,
  ],
  output: [
    { key: "items", type: "array", label: "Cards" },
    { key: "nextToken", type: "string", label: "Token for the next page, if any" },
  ],

  async execute(input, ctx) {
    const { items, nextToken } = await new GuruClient(ctx).page<Record<string, unknown>>(
      "/search/cardmgr",
      {
        query: {
          q: input.q,
          searchTerms: input.searchTerms,
          queryType: input.queryType,
          showArchived: input.showArchived,
          maxResults: input.maxResults,
          sortField: input.sortField,
          sortOrder: input.sortOrder,
          token: input.token,
        },
      },
    );
    return { items: items.map(stripTokens), nextToken };
  },
};

export default cardSearch;
