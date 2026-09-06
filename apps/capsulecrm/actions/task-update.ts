import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import { buildTaskBody, taskFieldParams, type TaskFieldsInput } from "../lib/task.ts";

interface Input extends TaskFieldsInput {
  taskId: number;
}

const taskUpdate: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Change an existing task — e.g. mark it completed. Only the fields you set are " +
    "touched.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
    ...taskFieldParams,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "OPEN", label: "Open" },
        { value: "COMPLETED", label: "Completed" },
        { value: "PENDING", label: "Pending" },
      ],
    },
  ],
  output: [{ key: "task", type: "object", label: "Task" }],

  async execute(input, ctx) {
    const { data } = await new CapsuleClient(ctx).request<{ task: unknown }>(
      `/tasks/${input.taskId}`,
      { method: "PUT", body: { task: buildTaskBody(input) } },
    );
    return { task: data.task };
  },
};

export default taskUpdate;
