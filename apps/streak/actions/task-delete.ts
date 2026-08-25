import type { ActionDefinition } from "@w6w/types";
import { taskKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/** `DELETE /tasks/{taskKey}`. */
interface Input {
  taskKey: string;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Permanently delete a task.",
  idempotent: true,
  params: [taskKeyParam],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  execute(input, ctx) {
    return new StreakClient(ctx).del(`/tasks/${encodeId(input.taskKey)}`);
  },
};

export default taskDelete;
