import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
  section: string;
}

const moveTask: ActionDefinition<Input> = {
  key: "move-task",
  type: "perform",
  resource: "task",
  title: "Move Task to Section",
  description: "Move a task into the given section (POST /sections/{section}/addTask).",
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { key: "section", label: "Section ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/sections/${input.section}/addTask`, {
      method: "POST",
      body: { task: input.id },
    });
  },
};

export default moveTask;
