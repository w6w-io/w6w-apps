import type { ActionDefinition } from "@w6w/types";
import { taskKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/** `POST /tasks/{taskKey}` — edit a task's text, due date or status. */
interface Input {
  taskKey: string;
  text?: string;
  dueDate?: number;
  status?: string;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Edit a task's text, due date or completion status.",
  idempotent: true,
  params: [
    taskKeyParam,
    { key: "text", label: "Task Text", type: "string" },
    { key: "dueDate", label: "Due Date", type: "number", hint: "Milliseconds since epoch." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "DONE", label: "Done" },
        { value: "NOT_DONE", label: "Not Done" },
      ],
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated task" }],

  execute(input, ctx) {
    const { taskKey, ...body } = input;
    return new StreakClient(ctx).sendJson("POST", `/tasks/${encodeId(taskKey)}`, body);
  },
};

export default taskUpdate;
