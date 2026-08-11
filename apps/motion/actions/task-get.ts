import type { ActionDefinition } from "@w6w/types";
import { encodeId, MotionClient, V1 } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `GET /v1/tasks/{id}` — one task, in full.
 *
 * The response is the richest object in this API and carries three things worth
 * knowing about:
 *
 *  - **`scheduledStart` / `scheduledEnd`** — when Motion's scheduler has decided
 *    this task will happen. They are outputs of the engine, not inputs; nothing
 *    in this app sets them.
 *  - **`schedulingIssue`** — `true` when Motion could *not* place the task. A
 *    workflow that creates auto-scheduled tasks should branch on this, because
 *    the create call itself succeeds either way.
 *  - **`customFieldValues`** — a record keyed by the custom field's **name**,
 *    not its id, each value a `{type, value}` pair. The id you need to *write* a
 *    value comes from `custom-field-list`, which is a different key space.
 */
interface Input {
  id: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task by id, including its schedule, status and custom field values.",
  params: [taskIdParam],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status.name", type: "string", label: "Status" },
    { key: "completed", type: "boolean", label: "Completed" },
    { key: "dueDate", type: "string", label: "Due date" },
    { key: "scheduledStart", type: "string", label: "Scheduled start" },
    { key: "scheduledEnd", type: "string", label: "Scheduled end" },
    { key: "schedulingIssue", type: "boolean", label: "Motion could not schedule this task" },
    { key: "customFieldValues", type: "object", label: "Custom field values, keyed by field NAME" },
  ],

  execute(input, ctx) {
    return new MotionClient(ctx).json(`${V1}/tasks/${encodeId(input.id)}`);
  },
};

export default taskGet;
