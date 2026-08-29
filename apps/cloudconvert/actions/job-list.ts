import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";
import {
  includeJobParam,
  jobStatusOptions,
  type PaginationInput,
  paginationParams,
  paginationQuery,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  filterStatus?: string;
  filterTag?: string;
  filterAccessToken?: string;
  include?: string[] | string;
}

/**
 * `GET /v2/jobs` — list all jobs on the account.
 *
 * Pagination is Laravel-style (`links`/`meta.current_page`), not offset/limit — there is
 * no `total` in the response, unlike some other apps in this pack.
 */
const jobList: ActionDefinition<Input> = {
  key: "job-list",
  type: "search",
  resource: "job",
  title: "List Jobs",
  description: "List all your jobs, optionally filtered by status, tag or the API key that " +
    "created them.",
  params: [
    {
      key: "filterStatus",
      label: "Status",
      type: "select",
      options: jobStatusOptions.filter((o) => o.value !== "waiting"),
      hint: "Only jobs with this status (processing, finished or error).",
    },
    { key: "filterTag", label: "Tag", type: "string", hint: "Only jobs with this exact tag." },
    {
      key: "filterAccessToken",
      label: "Created by API key ID",
      type: "string",
      advanced: true,
      hint: "Only jobs created with a specific access token (API key) ID.",
    },
    includeJobParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Jobs" },
    { key: "meta", type: "object", label: "Pagination metadata (current_page, per_page, ...)" },
  ],

  execute(input, ctx) {
    return new CloudConvertClient(ctx).page(`/jobs`, {
      query: {
        "filter[status]": input.filterStatus,
        "filter[tag]": input.filterTag,
        "filter[access_token]": input.filterAccessToken,
        include: input.include,
        ...paginationQuery(input),
      },
    });
  },
};

export default jobList;
