import type { ActionDefinition } from "@w6w/types";
import { NeverBounceClient } from "../lib/client.ts";

interface Input {
  jobId?: number;
  filename?: string;
  jobStatus?: string;
  page?: number;
  itemsPerPage?: number;
}

/**
 * `GET /jobs/search` — list/filter bulk verification jobs on the account.
 * Source: the OAS `operationId: jobs-search` embedded in
 * `https://developers.neverbounce.com/reference/single` (the full spec is
 * embedded once per page, covering every path — see `lib/client.ts`'s module
 * doc).
 *
 * `job_status` takes no documented enum in the OAS; the vendor's dashboard and
 * `jobs-status`'s own `job_status` output field use values like `under_review`,
 * `queued`, `parsing`, `waiting`, `running`, `complete`, and `failed`, but no
 * closed list was found in the spec, so this stays a free-text field rather
 * than a `select` with invented options.
 */
const jobsSearch: ActionDefinition<Input> = {
  key: "jobs-search",
  type: "read",
  resource: "job",
  title: "Search Jobs",
  description: "List and filter bulk verification jobs on the account.",
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "number",
      hint: "Filter to a single job by its id.",
    },
    {
      key: "filename",
      label: "Filename",
      type: "string",
      hint: "Filter by the job's filename (exact match).",
    },
    {
      key: "jobStatus",
      label: "Job Status",
      type: "string",
      hint: "Filter by job status, e.g. complete, running, queued.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      advanced: true,
    },
    {
      key: "itemsPerPage",
      label: "Items Per Page",
      type: "number",
      default: 10,
      advanced: true,
    },
  ],
  output: [
    { key: "total_results", type: "number", label: "Total matching jobs" },
    { key: "total_pages", type: "number", label: "Total pages" },
    { key: "results", type: "array", label: "Matching jobs" },
    { key: "execution_time", type: "number", label: "Server-side execution time, in ms" },
  ],

  execute(input, ctx) {
    const client = new NeverBounceClient(ctx);
    return client.request("/jobs/search", {
      query: {
        job_id: input.jobId,
        filename: input.filename,
        job_status: input.jobStatus,
        page: input.page,
        items_per_page: input.itemsPerPage,
      },
    });
  },
};

export default jobsSearch;
