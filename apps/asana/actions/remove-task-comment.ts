import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const removeTaskComment: ActionDefinition<Input> = {
  key: "remove-task-comment",
  type: "perform",
  resource: "task-comment",
  title: "Remove Task Comment",
  description: "Delete a task comment (story) by ID.",
  idempotent: true,
  params: [
    { key: "id", label: "Comment (Story) ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/stories/${input.id}`, { method: "DELETE" });
  },
};

export default removeTaskComment;
