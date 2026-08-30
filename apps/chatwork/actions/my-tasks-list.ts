import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { taskStatusOptions } from "../lib/params.ts";

interface Input {
  assignedByAccountId?: number;
  status?: string;
}

/**
 * `GET /my/tasks` — every task assigned to me, across all chats.
 *
 * Documents a `204 No Content` for the empty case instead of `200 []`;
 * {@link ChatworkClient.list} normalises that to `[]`.
 */
const myTasksList: ActionDefinition<Input> = {
  key: "my-tasks-list",
  type: "read",
  resource: "task",
  title: "List My Tasks",
  description: "List tasks assigned to the connected account across every chat.",
  params: [
    {
      key: "assignedByAccountId",
      label: "Requested by (Account ID)",
      type: "number",
      hint: "Only tasks assigned to me BY this account.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: taskStatusOptions,
      hint: "Leave empty for both open and done.",
    },
  ],
  output: [
    { key: "task_id", type: "number", label: "Task ID" },
    { key: "room", type: "object", label: "The chat the task belongs to" },
    { key: "assigned_by_account", type: "object", label: "Who assigned this task" },
    { key: "message_id", type: "string", label: "The message ID the task came from" },
    { key: "body", type: "string", label: "Task text" },
    { key: "limit_time", type: "number", label: "Deadline (Unix seconds), 0 if none" },
    { key: "status", type: "string", label: "open | done" },
    { key: "limit_type", type: "string", label: "none | date | time" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).list("/my/tasks", {
      query: { assigned_by_account_id: input.assignedByAccountId, status: input.status },
    });
  },
};

export default myTasksList;
