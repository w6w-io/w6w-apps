import type { ActionDefinition } from "@w6w/types";
import { JobNimbusClient } from "../lib/client.ts";
import { LIST_PARAMS, listQuery } from "../lib/params.ts";

type Input = Record<string, unknown>;

/** `GET /tasks` — `{"count", "results"}`. */
const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description: "List JobNimbus tasks (to-dos and appointments), newest first by default. " +
    "Filter by `related.id` to scope to one contact or job, e.g. " +
    '{"must":[{"term":{"related.id":"<jnid>"}}]}.',
  params: LIST_PARAMS,
  output: [
    { key: "count", type: "number", label: "Total matching records" },
    { key: "results", type: "array", label: "Tasks" },
  ],

  async execute(input, ctx) {
    return await new JobNimbusClient(ctx).list("/tasks", listQuery(input));
  },
};

export default taskList;
