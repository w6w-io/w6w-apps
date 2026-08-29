import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam, taskStatusOptions } from "../lib/params.ts";

interface Input {
  roomId: string;
  accountId?: number;
  assignedByAccountId?: number;
  status?: string;
}

/**
 * `GET /rooms/{room_id}/tasks` — a chat's tasks.
 *
 * Documents a `204 No Content` for the empty case; {@link ChatworkClient.list}
 * normalises that to `[]`.
 */
const roomTaskList: ActionDefinition<Input> = {
  key: "room-task-list",
  type: "read",
  resource: "task",
  title: "List Chat Tasks",
  description: "List a chat's tasks.",
  params: [
    roomIdParam,
    {
      key: "accountId",
      label: "Assigned to (Account ID)",
      type: "number",
      hint: "Only tasks assigned to this account.",
    },
    {
      key: "assignedByAccountId",
      label: "Requested by (Account ID)",
      type: "number",
      hint: "Only tasks assigned BY this account.",
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
    { key: "account", type: "object", label: "Who the task is assigned to" },
    { key: "assigned_by_account", type: "object", label: "Who assigned this task" },
    { key: "message_id", type: "string", label: "The message ID the task came from" },
    { key: "body", type: "string", label: "Task text" },
    { key: "limit_time", type: "number", label: "Deadline (Unix seconds), 0 if none" },
    { key: "status", type: "string", label: "open | done" },
    { key: "limit_type", type: "string", label: "none | date | time" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).list(`/rooms/${encodeURIComponent(input.roomId)}/tasks`, {
      query: {
        account_id: input.accountId,
        assigned_by_account_id: input.assignedByAccountId,
        status: input.status,
      },
    });
  },
};

export default roomTaskList;
