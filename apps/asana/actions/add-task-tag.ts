import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
  tag: string;
}

const addTaskTag: ActionDefinition<Input> = {
  key: "add-task-tag",
  type: "perform",
  resource: "task-tag",
  title: "Add Tag to Task",
  description: "Add a tag to a task.",
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { key: "tag", label: "Tag ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/tasks/${input.id}/addTag`, {
      method: "POST",
      body: { tag: input.tag },
    });
  },
};

export default addTaskTag;
