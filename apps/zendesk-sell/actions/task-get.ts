import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Retrieve a single task by ID.",
  params: [
    { key: "id", label: "Task ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "completed", type: "boolean", label: "Completed" },
  ],

  async execute(input, ctx) {
    return await new SellClient(ctx).get(`/tasks/${encodeURIComponent(String(input.id))}`);
  },
};

export default taskGet;
