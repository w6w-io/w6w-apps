import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient, type VapiPage } from "../lib/client.ts";
import { type DateRangeInput, dateRangeParams, dateRangeQuery, limitParam } from "../lib/params.ts";

/**
 * `GET /v2/phone-number` — the ONE list endpoint in this app that does NOT
 * answer a bare array. It answers `{"results": [...], "metadata": {...}}` and
 * paginates by `page` number, unlike every other list here which paginates by
 * `createdAt`/`updatedAt` range only. The legacy `GET /phone-number` (bare
 * array, no `page`) still exists but is not called by this app — v2 is the
 * vendor's own current documented form and additionally supports `search`.
 */
interface Input extends DateRangeInput {
  search?: string;
  page?: number;
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
}

const phoneNumberList: ActionDefinition<Input> = {
  key: "phone-number-list",
  type: "search",
  resource: "phone-number",
  title: "List Phone Numbers",
  description: "List phone numbers, page by page (this endpoint does not paginate by date range).",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Partial, case-insensitive match against name, number or SIP URI.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "createdAt", label: "Created at (default)" },
        { value: "duration", label: "Duration" },
        { value: "cost", label: "Cost" },
      ],
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "DESC", label: "Descending (default)" },
        { value: "ASC", label: "Ascending" },
      ],
    },
    limitParam,
    ...dateRangeParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Phone numbers" },
    { key: "totalItems", type: "number", label: "Total matching phone numbers" },
    { key: "currentPage", type: "number", label: "Current page" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "hasNextPage", type: "boolean", label: "Has next page" },
  ],

  async execute(input, ctx) {
    const page = await new VapiClient(ctx).json<VapiPage<unknown>>("/v2/phone-number", {
      query: {
        search: input.search,
        page: input.page,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
        limit: input.limit,
        ...dateRangeQuery(input),
      },
    });
    return {
      items: stripSecrets(page.results),
      totalItems: page.metadata?.totalItems,
      currentPage: page.metadata?.currentPage,
      totalPages: page.metadata?.totalPages,
      hasNextPage: page.metadata?.hasNextPage,
    };
  },
};

export default phoneNumberList;
