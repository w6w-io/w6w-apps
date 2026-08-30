import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam, taskIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  taskId: number;
}

/** `GET /rooms/{room_id}/tasks/{task_id}` — one task's full detail. */
const roomTaskGet: ActionDefinition<Input> = {
  key: "room-task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task's full detail.",
  params: [roomIdParam, taskIdParam],
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
    return new ChatworkClient(ctx).json(
      `/rooms/${encodeURIComponent(input.roomId)}/tasks/${input.taskId}`,
    );
  },
};

export default roomTaskGet;
