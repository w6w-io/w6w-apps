import type { ActionDefinition } from "@w6w/types";
import { flag, MotionClient, V1 } from "../lib/client.ts";
import { assigneeIdParam, cursorParam, pageOutput, workspaceIdParam } from "../lib/params.ts";

/**
 * `GET /v1/tasks` — every task matching a query.
 *
 * ## Leaving the workspace empty is the expensive default
 *
 * The reference is explicit: with no `workspaceId`, Motion returns tasks from
 * **all workspaces the user is a member of**. On an account with several
 * workspaces that is a much larger walk than intended, and it is paid for in
 * requests — the individual tier allows 12 a minute. Set the workspace when you
 * know it.
 *
 * ## `includeAllStatuses`
 *
 * By default the list is filtered to the statuses that exist on tasks; turning
 * this on lifts that. The reference states it is mutually exclusive with the
 * `status` filter — and `status` is a query array whose encoding Motion never
 * documents, so this app does not offer it at all. See `lib/params.ts`.
 */
interface Input {
  workspaceId?: string;
  assigneeId?: string;
  projectId?: string;
  name?: string;
  label?: string;
  includeAllStatuses?: boolean;
  cursor?: string;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List tasks, optionally filtered by workspace, project, assignee, label or name.",
  params: [
    workspaceIdParam(
      false,
      "Leave empty and Motion returns tasks from EVERY workspace you belong to, which is a much " +
        "larger result than it looks. From the `id` of a List Workspaces result.",
    ),
    {
      key: "projectId",
      label: "Project",
      type: "string",
      hint: "From the `id` of a List Projects result.",
    },
    assigneeIdParam,
    {
      key: "name",
      label: "Name contains",
      type: "string",
      hint: "Case-insensitive substring match on the task name.",
    },
    {
      key: "label",
      label: "Label",
      type: "string",
      hint: "A single label name. Labels are named, not id'd.",
    },
    {
      key: "includeAllStatuses",
      label: "Include all statuses",
      type: "boolean",
      hint: "Off by default, matching the API — the list is otherwise limited to the statuses " +
        "that exist on tasks.",
    },
    cursorParam,
  ],
  output: [
    { key: "items", type: "array", label: "Tasks" },
    ...pageOutput,
  ],

  execute(input, ctx) {
    return new MotionClient(ctx).page(`${V1}/tasks`, "tasks", {
      query: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        assigneeId: input.assigneeId,
        name: input.name,
        label: input.label,
        includeAllStatuses: flag(input.includeAllStatuses),
        cursor: input.cursor,
      },
    });
  },
};

export default taskList;
