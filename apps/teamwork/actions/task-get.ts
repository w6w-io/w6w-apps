import type { ActionDefinition } from "@w6w/types";
import { TeamworkClient } from "../lib/client.ts";
import { taskOutput } from "../lib/params.ts";

interface Input {
  taskId: number;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Fetch a single task by id.",
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
  ],
  output: taskOutput,

  async execute(input, ctx) {
    const body = await new TeamworkClient(ctx).request<{ task: unknown }>(
      `/projects/api/v3/tasks/${input.taskId}.json`,
    );
    return body.task;
  },
};

export default taskGet;
