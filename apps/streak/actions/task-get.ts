import type { ActionDefinition } from "@w6w/types";
import { taskKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/** `GET /tasks/{taskKey}`. */
interface Input {
  taskKey: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch one task.",
  params: [taskKeyParam],
  output: [{ key: "data", type: "object", label: "The task" }],

  execute(input, ctx) {
    return new StreakClient(ctx).get(`/tasks/${encodeId(input.taskKey)}`);
  },
};

export default taskGet;
