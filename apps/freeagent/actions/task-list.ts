import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient, ref } from "../lib/client.ts";
import { updatedSince } from "../lib/params.ts";

interface Input {
  view?: "all" | "active" | "completed" | "hidden";
  projectId?: string;
  sort?: "name" | "project" | "billing_rate" | "created_at" | "updated_at";
  updatedSince?: string;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description: "List tasks, optionally scoped to a project.",
  params: [
    {
      key: "view",
      label: "View",
      type: "select",
      advanced: true,
      options: [
        { value: "all", label: "All (default)" },
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
        { value: "hidden", label: "Hidden" },
      ],
    },
    { key: "projectId", label: "Project ID", type: "string", advanced: true },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "name", label: "Name (default)" },
        { value: "project", label: "Project" },
        { value: "billing_rate", label: "Billing rate" },
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    updatedSince,
  ],
  output: [{ key: "tasks", type: "array", label: "Tasks" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/tasks", {
      query: {
        view: input.view,
        project: input.projectId ? ref("projects", input.projectId) : undefined,
        sort: input.sort,
        updated_since: input.updatedSince,
      },
    });
  },
};

export default taskList;
