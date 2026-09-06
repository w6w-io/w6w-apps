import type { ActionDefinition } from "@w6w/types";
import { NeverBounceClient } from "../lib/client.ts";

interface Input {
  jobId: number;
  page?: number;
  itemsPerPage?: number;
}

/**
 * `GET /jobs/results` — paginated per-row verification results for a
 * completed job. Source: the OAS `operationId: jobs-results`. `items_per_page`
 * is documented "between 1 and 1000" — left unenforced here rather than
 * inventing a `validation.max`, since the vendor may change it without notice
 * and a rejected-locally call would just 400 upstream instead.
 */
const jobsResults: ActionDefinition<Input> = {
  key: "jobs-results",
  type: "read",
  resource: "job",
  title: "Get Job Results",
  description: "Read per-row verification results for a job, one page at a time.",
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "number",
      required: true,
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
      hint: "Between 1 and 1000.",
      advanced: true,
    },
  ],
  output: [
    { key: "total_results", type: "number", label: "Total rows in the job" },
    { key: "total_pages", type: "number", label: "Total pages at this page size" },
    { key: "results", type: "array", label: "Per-row results (data + verification)" },
    { key: "execution_time", type: "number", label: "Server-side execution time, in ms" },
  ],

  execute(input, ctx) {
    const client = new NeverBounceClient(ctx);
    return client.request("/jobs/results", {
      query: { job_id: input.jobId, page: input.page, items_per_page: input.itemsPerPage },
    });
  },
};

export default jobsResults;
