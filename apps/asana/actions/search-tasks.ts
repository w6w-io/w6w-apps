import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  workspace: string;
  text?: string;
  completed?: boolean;
}

const searchTasks: ActionDefinition<Input> = {
  key: "search-tasks",
  type: "search",
  resource: "task",
  title: "Search Tasks",
  description: "Search for tasks in a workspace (GET /workspaces/{workspace}/tasks/search).",
  params: [
    { key: "workspace", label: "Workspace ID", type: "string", required: true },
    { key: "text", label: "Text", type: "text", hint: "Text to search in name or notes." },
    { key: "completed", label: "Completed", type: "boolean" },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(
      `/workspaces/${input.workspace}/tasks/search`,
      {
        query: {
          text: input.text,
          completed: input.completed,
        },
      },
    );
  },
};

export default searchTasks;
