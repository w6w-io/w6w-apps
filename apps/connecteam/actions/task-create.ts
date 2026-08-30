import type { ActionDefinition } from "@w6w/types";
import { compact, ConnecteamClient, toIdList, toList } from "../lib/client.ts";
import { taskBoardIdParam, taskStatusOptions } from "../lib/params.ts";

/**
 * `POST /tasks/v1/taskboards/{taskBoardId}/tasks` — create one task.
 *
 * More than one assigned user makes it a group task rather than several
 * individual tasks; to assign the same task individually to several people,
 * call this once per person instead. Leaving Assigned users empty is only
 * valid for a draft, non-archived task.
 *
 * Not idempotent: every call creates a new task; there is no idempotency key.
 */
interface Input {
  taskBoardId: string;
  title: string;
  status: string;
  userIds?: string;
  startTime?: number;
  dueDate?: number;
  labelIds?: string;
  description?: string;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create one task on a task board.",
  idempotent: false,
  params: [
    taskBoardIdParam,
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      default: "draft",
      options: taskStatusOptions,
    },
    {
      key: "userIds",
      label: "Assigned user IDs",
      type: "string",
      hint: "Comma-separated. More than one makes this a group task. Empty is only valid for a " +
        "draft, non-archived task.",
    },
    { key: "startTime", label: "Start time (Unix seconds)", type: "number" },
    { key: "dueDate", label: "Due date (Unix seconds)", type: "number" },
    { key: "labelIds", label: "Label IDs", type: "string", hint: "Comma-separated." },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data(
      `/tasks/v1/taskboards/${input.taskBoardId}/tasks`,
      {
        method: "POST",
        body: {
          userIds: toIdList(input.userIds) ?? [],
          ...compact({
            title: input.title,
            status: input.status,
            startTime: input.startTime,
            dueDate: input.dueDate,
            labelIds: toList(input.labelIds),
            description: input.description ? { content: input.description } : undefined,
          }),
        },
      },
    );
  },
};

export default taskCreate;
