import type { ActionDefinition } from "@w6w/types";
import { JobNimbusClient } from "../lib/client.ts";
import { LIST_PARAMS, listQuery } from "../lib/params.ts";

type Input = Record<string, unknown>;

/** `GET /jobs` — `{"count", "results"}`. */
const jobList: ActionDefinition<Input> = {
  key: "job-list",
  type: "read",
  resource: "job",
  title: "List Jobs",
  description: "List JobNimbus jobs, newest first by default. Supports JobNimbus's own " +
    "Elasticsearch-syntax filter, offset pagination and sort.",
  params: LIST_PARAMS,
  output: [
    { key: "count", type: "number", label: "Total matching records" },
    { key: "results", type: "array", label: "Jobs" },
  ],

  async execute(input, ctx) {
    return await new JobNimbusClient(ctx).list("/jobs", listQuery(input));
  },
};

export default jobList;
