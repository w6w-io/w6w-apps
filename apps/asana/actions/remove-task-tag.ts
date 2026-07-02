import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
  tag: string;
}

const removeTaskTag: ActionDefinition<Input> = {
  key: "remove-task-tag",
  type: "perform",
  resource: "task-tag",
  title: "Remove Tag from Task",
  description: "Remove a tag from a task.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { key: "tag", label: "Tag ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/tasks/${input.id}/removeTag`, {
      method: "POST",
      body: { tag: input.tag },
    });
  },
};

export default removeTaskTag;
