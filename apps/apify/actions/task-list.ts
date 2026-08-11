import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, type ApifyListPage, flag } from "../lib/client.ts";
import { descParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/actor-tasks` — the saved Actor configurations on this account.
 *
 * A task is an Actor plus stored input, so running a task is how a workflow
 * calls a scraper whose configuration lives in Apify rather than in the
 * workflow. That matters operationally: change the task in Apify Console and
 * every workflow calling it picks the change up with no edit — which is the good
 * case and the surprising case at once.
 */
interface Input {
  desc?: boolean;
  limit?: number;
  offset?: number;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List the Actor tasks this account has created or used.",
  params: [
    descParam,
    ...paginationParams(100, "Apify's own default and maximum is 1000; 100 is prefilled here."),
  ],
  output: [
    { key: "items", type: "array", label: "Tasks" },
    { key: "total", type: "number", label: "Total matching tasks" },
    { key: "count", type: "number", label: "Tasks in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
  ],

  execute(input, ctx) {
    return new ApifyClient(ctx).data<ApifyListPage<unknown>>("/actor-tasks", {
      query: { desc: flag(input.desc), limit: input.limit, offset: input.offset },
    });
  },
};

export default taskList;
