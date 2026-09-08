import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import { buildTaskBody, taskFieldParams, type TaskFieldsInput } from "../lib/task.ts";

interface Input extends TaskFieldsInput {
  description: string;
  dueOn: string;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a new task, optionally linked to a party or opportunity.",
  idempotent: false,
  params: taskFieldParams.map((p) =>
    p.key === "description" || p.key === "dueOn" ? { ...p, required: true } : p
  ),
  output: [{ key: "task", type: "object", label: "Task" }],

  async execute(input, ctx) {
    const { data } = await new CapsuleClient(ctx).request<{ task: unknown }>("/tasks", {
      method: "POST",
      body: { task: buildTaskBody(input) },
    });
    return { task: data.task };
  },
};

export default taskCreate;
