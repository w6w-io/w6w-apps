import type { ActionDefinition } from "@w6w/types";
import { ServiceM8Client, type ServiceM8Page } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /job.json` — list Jobs (the same resource that backs Quotes, Work
 * Orders and Completed jobs; `status` is what distinguishes them).
 *
 * The OpenAPI document declares no per-field query parameters for this
 * operation (only `ServiceTemplate` gets those) — every list endpoint in this
 * app instead offers the generic `$filter`/`$sort`/`cursor` trio that
 * `filtering.md` and `pagination.md` document as working everywhere.
 */
interface Input {
  filter?: string;
  sort?: string;
  cursor?: string;
}

const jobList: ActionDefinition<Input, ServiceM8Page<unknown>> = {
  key: "job-list",
  type: "search",
  resource: "job",
  title: "Find Jobs",
  description: "List Jobs — Quotes, Work Orders, Unsuccessful and Completed — with optional " +
    "$filter/$sort and cursor pagination.",
  params: listParams(),
  output: listOutput("Jobs"),

  execute(input, ctx) {
    return new ServiceM8Client(ctx).list("/job.json", {
      query: { "$filter": input.filter, "$sort": input.sort, cursor: input.cursor },
    });
  },
};

export default jobList;
