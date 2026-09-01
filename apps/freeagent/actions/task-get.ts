import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient } from "../lib/client.ts";

interface Input {
  taskId: string;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Get a single task by id.",
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true },
  ],
  output: [{ key: "task", type: "object", label: "Task" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request(`/tasks/${input.taskId}`);
  },
};

export default taskGet;
