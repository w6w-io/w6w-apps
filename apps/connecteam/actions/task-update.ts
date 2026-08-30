import type { ActionDefinition } from "@w6w/types";
import { compact, ConnecteamClient, toIdList, toList } from "../lib/client.ts";
import { taskBoardIdParam, taskIdParam, taskStatusOptions } from "../lib/params.ts";

/**
 * `PUT /tasks/v1/taskboards/{taskBoardId}/tasks/{taskId}` — replace one
 * task's fields. Connecteam's schema requires `userIds`, `status` and
 * `title` even on update — this is a full replace of those fields, not a
 * sparse patch, so all three are required here too.
 *
 * Idempotent: setting the same target fields twice leaves the same state.
 * The response's `droppedUserIds` names any previously-assigned users this
 * update removed.
 */
interface Input {
  taskBoardId: string;
  taskId: string;
  title: string;
  status: string;
  userIds?: string;
  startTime?: number;
  dueDate?: number;
  labelIds?: string;
  isArchived?: boolean;
  description?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Replace a task's title, status, assignment and scheduling fields.",
  idempotent: true,
  params: [
    taskBoardIdParam,
    taskIdParam,
    { key: "title", label: "Title", type: "string", required: true },
    { key: "status", label: "Status", type: "select", required: true, options: taskStatusOptions },
    {
      key: "userIds",
      label: "Assigned user IDs",
      type: "string",
      hint: "Comma-separated. Replaces the whole assignment list.",
    },
    { key: "startTime", label: "Start time (Unix seconds)", type: "number" },
    { key: "dueDate", label: "Due date (Unix seconds)", type: "number" },
    { key: "labelIds", label: "Label IDs", type: "string", hint: "Comma-separated." },
    { key: "isArchived", label: "Archived", type: "boolean" },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "droppedUserIds", type: "array", label: "Users removed by this update" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data(
      `/tasks/v1/taskboards/${input.taskBoardId}/tasks/${input.taskId}`,
      {
        method: "PUT",
        body: {
          userIds: toIdList(input.userIds) ?? [],
          ...compact({
            title: input.title,
            status: input.status,
            startTime: input.startTime,
            dueDate: input.dueDate,
            labelIds: toList(input.labelIds),
            isArchived: input.isArchived,
            description: input.description ? { content: input.description } : undefined,
          }),
        },
      },
    );
  },
};

export default taskUpdate;
