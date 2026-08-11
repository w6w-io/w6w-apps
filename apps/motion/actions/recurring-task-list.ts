import type { ActionDefinition } from "@w6w/types";
import { MotionClient, V1 } from "../lib/client.ts";
import { cursorParam, pageOutput, workspaceIdParam } from "../lib/params.ts";

/**
 * `GET /v1/recurring-tasks` — the recurring-task *definitions* in a workspace.
 *
 * `workspaceId` is **required** here, unlike on `GET /v1/tasks` and
 * `GET /v1/projects` where it is optional. There is no account-wide form.
 *
 * The response's array is named `tasks`, not `recurringTasks` — the same key the
 * ordinary task list uses, for a different kind of object. A recurring task is a
 * template: the individual occurrences it produces are ordinary tasks, and each
 * one carries `parentRecurringTaskId` pointing back at the definition listed
 * here.
 */
interface Input {
  workspaceId: string;
  cursor?: string;
}

const recurringTaskList: ActionDefinition<Input> = {
  key: "recurring-task-list",
  type: "search",
  resource: "recurring-task",
  title: "List Recurring Tasks",
  description: "List the recurring-task definitions in a workspace.",
  params: [
    workspaceIdParam(
      true,
      "Required by this endpoint — Motion offers no account-wide recurring-task list.",
    ),
    cursorParam,
  ],
  output: [
    { key: "items", type: "array", label: "Recurring task definitions" },
    ...pageOutput,
  ],

  execute(input, ctx) {
    // The vendor names this collection `tasks`, not `recurringTasks`.
    return new MotionClient(ctx).page(`${V1}/recurring-tasks`, "tasks", {
      query: { workspaceId: input.workspaceId, cursor: input.cursor },
    });
  },
};

export default recurringTaskList;
