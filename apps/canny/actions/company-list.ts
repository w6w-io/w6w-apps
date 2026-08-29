import type { ActionDefinition } from "@w6w/types";
import { v2 } from "../lib/client.ts";
import { cursorLimitParams } from "../lib/params.ts";

/**
 * `POST /v2/companies/list` — search or list companies.
 *
 * Per Canny's own docs, when `search` is set the response's `hasNextPage`
 * is always `false` and `cursor` is always `null` — search does not paginate.
 */
interface Input {
  search?: string;
  segment?: string;
  limit?: number;
  cursor?: string;
}

const companyList: ActionDefinition<Input> = {
  key: "company-list",
  type: "search",
  resource: "company",
  title: "List Companies",
  description: "Search or list companies. Note: a text search does not paginate.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Search by company name." },
    {
      key: "segment",
      label: "Segment",
      type: "string",
      advanced: true,
      hint: "The URL name of the segment to filter companies by.",
    },
    ...cursorLimitParams(10, 100),
  ],
  output: [
    { key: "companies", type: "array", label: "Companies" },
    { key: "hasNextPage", type: "boolean", label: "More companies beyond this page" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return v2(ctx).post("/companies/list", {
      search: input.search,
      segment: input.segment,
      limit: input.limit,
      cursor: input.cursor,
    });
  },
};

export default companyList;
