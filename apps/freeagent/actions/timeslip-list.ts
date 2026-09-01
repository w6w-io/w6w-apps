import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient, ref } from "../lib/client.ts";
import { fromDate, page, perPage, toDate, updatedSince } from "../lib/params.ts";

interface Input {
  view?: "all" | "unbilled" | "running";
  userId?: string;
  taskId?: string;
  projectId?: string;
  fromDate?: string;
  toDate?: string;
  updatedSince?: string;
  nested?: boolean;
  page?: number;
  perPage?: number;
}

const timeslipList: ActionDefinition<Input> = {
  key: "timeslip-list",
  type: "read",
  resource: "timeslip",
  title: "List Timeslips",
  description: "List timeslips, optionally filtered by user, task or project.",
  params: [
    {
      key: "view",
      label: "View",
      type: "select",
      advanced: true,
      options: [
        { value: "all", label: "All (default)" },
        { value: "unbilled", label: "Not yet rebilled" },
        { value: "running", label: "Running timers" },
      ],
    },
    { key: "userId", label: "User ID", type: "string", advanced: true },
    { key: "taskId", label: "Task ID", type: "string", advanced: true },
    { key: "projectId", label: "Project ID", type: "string", advanced: true },
    fromDate,
    toDate,
    updatedSince,
    {
      key: "nested",
      label: "Nested resources",
      type: "boolean",
      advanced: true,
      hint: "Return full user/project/task objects instead of URL references.",
    },
    page,
    perPage,
  ],
  output: [{ key: "timeslips", type: "array", label: "Timeslips" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/timeslips", {
      query: {
        view: input.view,
        user: input.userId ? ref("users", input.userId) : undefined,
        task: input.taskId ? ref("tasks", input.taskId) : undefined,
        project: input.projectId ? ref("projects", input.projectId) : undefined,
        from_date: input.fromDate,
        to_date: input.toDate,
        updated_since: input.updatedSince,
        nested: input.nested,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default timeslipList;
