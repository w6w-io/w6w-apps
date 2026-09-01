import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const taskDelete: ActionDefinition<Input> = {
  key: "task-delete",
  type: "perform",
  resource: "task",
  title: "Delete Task",
  description: "Delete a task. Cannot be undone.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new SellClient(ctx).remove(`/tasks/${encodeURIComponent(String(input.id))}`);
    return {};
  },
};

export default taskDelete;
