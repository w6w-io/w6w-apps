import type { ActionDefinition } from "@w6w/types";
import { ServiceM8Client, type ServiceM8Page } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /jobactivity.json` — list Job Activities: both scheduled bookings
 * (`activity_was_scheduled == 1`) and recorded time / check-ins
 * (`activity_was_scheduled == 0`) are the SAME resource, per
 * `rest-overview.md`'s naming table. Use `$filter` (e.g.
 * `activity_was_scheduled eq 1`) to tell them apart.
 */
interface Input {
  filter?: string;
  sort?: string;
  cursor?: string;
}

const jobActivityList: ActionDefinition<Input, ServiceM8Page<unknown>> = {
  key: "jobactivity-list",
  type: "search",
  resource: "jobactivity",
  title: "Find Job Activities",
  description: "List Job Activities — scheduled bookings AND recorded time entries are both this " +
    "resource; filter on activity_was_scheduled to distinguish them.",
  params: listParams(),
  output: listOutput("Job Activities"),

  execute(input, ctx) {
    return new ServiceM8Client(ctx).list("/jobactivity.json", {
      query: { "$filter": input.filter, "$sort": input.sort, cursor: input.cursor },
    });
  },
};

export default jobActivityList;
