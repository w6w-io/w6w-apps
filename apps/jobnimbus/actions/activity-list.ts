import type { ActionDefinition } from "@w6w/types";
import { JobNimbusClient } from "../lib/client.ts";
import { LIST_PARAMS, listQuery } from "../lib/params.ts";

type Input = Record<string, unknown>;

/** `GET /activities` — `{"count", "results"}`. */
const activityList: ActionDefinition<Input> = {
  key: "activity-list",
  type: "read",
  resource: "activity",
  title: "List Activities",
  description: "List JobNimbus activities (notes and other logged events), newest first by " +
    "default. Filter by `related.id` to scope to one contact or job, e.g. " +
    '{"must":[{"term":{"related.id":"<jnid>"}}]}.',
  params: LIST_PARAMS,
  output: [
    { key: "count", type: "number", label: "Total matching records" },
    { key: "results", type: "array", label: "Activities" },
  ],

  async execute(input, ctx) {
    return await new JobNimbusClient(ctx).list("/activities", listQuery(input));
  },
};

export default activityList;
