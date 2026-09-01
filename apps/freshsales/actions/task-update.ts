import type { ActionDefinition } from "@w6w/types";
import { compact, FreshsalesClient, unset } from "../lib/client.ts";

interface Input {
  taskId: number;
  title?: string;
  description?: string;
  dueDate?: string;
  ownerId?: number;
  markDone?: boolean;
}

/**
 * Also covers "Mark Task as Done": the docs' dedicated endpoint for that is
 * the exact same `PUT /tasks/[:task_id]` with just `{"task":{"status":1}}` —
 * so `markDone` here sends the same body rather than adding a second action
 * for what is, on the wire, a one-field update.
 */
const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task, or mark it done. Only fields you set are changed.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "dueDate", label: "Due date", type: "datetime" },
    { key: "ownerId", label: "Owner (user) ID", type: "number", advanced: true },
    {
      key: "markDone",
      label: "Mark done",
      type: "boolean",
      hint: 'Sends the same status:1 update the docs\' "Mark Task as Done" endpoint uses.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new FreshsalesClient(ctx).resource("task", `/tasks/${input.taskId}`, {
      method: "PUT",
      body: {
        task: compact({
          title: unset(input.title),
          description: unset(input.description),
          due_date: unset(input.dueDate),
          owner_id: input.ownerId,
          status: input.markDone ? 1 : undefined,
        }),
      },
    });
  },
};

export default taskUpdate;
