import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  assignee?: string;
  project?: string;
  section?: string;
  workspace?: string;
  completed_since?: string;
  modified_since?: string;
  opt_fields?: string;
  opt_pretty?: boolean;
  limit?: number;
  offset?: string;
}

const listTasks: ActionDefinition<Input> = {
  key: "list-tasks",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description:
    "List tasks with optional filters. Walks one page; pass back `offset` (from `next_page.offset`) to get the next. Note: if `assignee` is set, `workspace` is required.",
  params: [
    { key: "assignee", label: "Assignee ID", type: "string" },
    { key: "project", label: "Project ID", type: "string" },
    { key: "section", label: "Section ID", type: "string" },
    { key: "workspace", label: "Workspace ID", type: "string" },
    { key: "completed_since", label: "Completed since (ISO datetime)", type: "string" },
    { key: "modified_since", label: "Modified since (ISO datetime)", type: "string" },
    { key: "opt_fields", label: "Fields", type: "string" },
    { key: "opt_pretty", label: "Pretty print", type: "boolean" },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset (pagination cursor)", type: "string" },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/tasks`, {
      query: {
        assignee: input.assignee,
        project: input.project,
        section: input.section,
        workspace: input.workspace,
        completed_since: input.completed_since,
        modified_since: input.modified_since,
        opt_fields: input.opt_fields,
        opt_pretty: input.opt_pretty,
        limit: input.limit ?? 100,
        offset: input.offset,
      },
    });
  },
};

export default listTasks;
