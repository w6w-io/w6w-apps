import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam, taskIdParam, taskStatusOptions } from "../lib/params.ts";

interface Input {
  roomId: string;
  taskId: number;
  body: "open" | "done";
}

/**
 * `PUT /rooms/{room_id}/tasks/{task_id}/status` — mark a task open or done.
 *
 * The response's own `task_id` is documented as a **string**, unlike every
 * other task_id in this API (an integer everywhere else, including the
 * request path). Declared as-is rather than coerced, since silently changing
 * its type would misrepresent what the vendor actually sends back.
 */
const roomTaskStatusUpdate: ActionDefinition<Input> = {
  key: "room-task-status-update",
  type: "perform",
  resource: "task",
  title: "Update Task Status",
  description: "Mark a task open or done.",
  idempotent: true,
  params: [
    roomIdParam,
    taskIdParam,
    { key: "body", label: "Status", type: "select", required: true, options: taskStatusOptions },
  ],
  output: [{
    key: "task_id",
    type: "string",
    label: "Task ID (returned as a string by this endpoint)",
  }],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(
      `/rooms/${encodeURIComponent(input.roomId)}/tasks/${input.taskId}/status`,
      { method: "PUT", form: { body: input.body } },
    );
  },
};

export default roomTaskStatusUpdate;
