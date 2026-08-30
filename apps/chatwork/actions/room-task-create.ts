import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam, taskLimitTypeOptions, toCsv } from "../lib/params.ts";

interface Input {
  roomId: string;
  body: string;
  toIds: string;
  limit?: number;
  limitType?: string;
}

/**
 * `POST /rooms/{room_id}/tasks` — create one task per assignee in a chat.
 *
 * Chatwork creates **one task object per account** in `to_ids`, all sharing
 * the same body and deadline — hence the response is `task_ids`, plural, even
 * for a single assignee.
 */
const roomTaskCreate: ActionDefinition<Input> = {
  key: "room-task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description:
    "Add a task to a chat. Creates one task per assignee in To — the response lists one task ID " +
    "per account.",
  idempotent: false,
  params: [
    roomIdParam,
    {
      key: "body",
      label: "Task text",
      type: "text",
      required: true,
      validation: { maxLength: 65535 },
    },
    {
      key: "toIds",
      label: "To (Account IDs)",
      type: "string",
      required: true,
      hint: "Comma-separated account IDs of members of this chat.",
    },
    {
      key: "limit",
      label: "Deadline (Unix seconds)",
      type: "number",
      hint: "Leave empty for no deadline.",
    },
    {
      key: "limitType",
      label: "Deadline type",
      type: "select",
      options: taskLimitTypeOptions,
      default: "time",
    },
  ],
  output: [{ key: "task_ids", type: "array", label: "New task IDs, one per assignee" }],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}/tasks`, {
      method: "POST",
      form: {
        body: input.body,
        to_ids: toCsv(input.toIds),
        limit: input.limit,
        limit_type: input.limitType,
      },
    });
  },
};

export default roomTaskCreate;
