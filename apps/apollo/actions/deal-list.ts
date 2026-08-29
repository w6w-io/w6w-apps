import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, type ApolloPagination, compact } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /opportunities/search` — list/search the deals in your Apollo pipeline. Despite
 * the "search" name this is a `GET` with plain query parameters (no bracket arrays or
 * body) — Apollo's simplest search endpoint.
 */
interface Input {
  sort_by_field?: string;
  page?: number;
  per_page?: number;
}

const dealList: ActionDefinition<Input> = {
  key: "deal-list",
  type: "search",
  resource: "deal",
  title: "List Deals",
  description: "List the deals in your Apollo pipeline.",
  params: [
    {
      key: "sort_by_field",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "amount", label: "Amount" },
        { value: "is_closed", label: "Closed" },
        { value: "closed_date", label: "Close date" },
      ],
    },
    ...paginationParams(25),
  ],
  output: [
    { key: "deals", type: "array", label: "The deals" },
    { key: "pagination", type: "object", label: "page, per_page, total_entries, total_pages" },
  ],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).get<
      { opportunities?: unknown[]; pagination?: ApolloPagination }
    >(
      "/opportunities/search",
      compact({ sort_by_field: input.sort_by_field, page: input.page, per_page: input.per_page }),
    );
    return { deals: body.opportunities ?? [], pagination: body.pagination ?? {} };
  },
};

export default dealList;
