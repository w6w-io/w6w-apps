import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient } from "../lib/client.ts";
import { sortOrderOptions, tagSortByOptions } from "../lib/params.ts";

/** `GET /c/{company_id}/tags` — "List candidate tags". */
interface Input {
  query?: string;
  sortBy?: string;
  sortOrder?: string;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Candidate Tags",
  description: "List the company's candidate tags.",
  params: [
    { key: "query", label: "Search query", type: "string" },
    { key: "sortBy", label: "Sort by", type: "select", options: tagSortByOptions },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: sortOrderOptions,
      default: "asc",
    },
  ],
  output: [
    { key: "tags", type: "array", label: "Tags" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request("/tags", {
      query: { query: input.query, sort_by: input.sortBy, sort_order: input.sortOrder },
    });
  },
};

export default tagList;
