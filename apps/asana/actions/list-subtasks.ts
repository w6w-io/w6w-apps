import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  taskId: string;
  limit?: number;
  offset?: string;
  opt_fields?: string;
  opt_pretty?: boolean;
}

const listSubtasks: ActionDefinition<Input> = {
  key: "list-subtasks",
  type: "read",
  resource: "subtask",
  title: "List Subtasks",
  description:
    "List subtasks of a parent task. Walks one page; pass back `offset` (from `next_page.offset`) to get the next.",
  params: [
    { key: "taskId", label: "Parent Task ID", type: "string", required: true },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset (pagination cursor)", type: "string" },
    {
      key: "opt_fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated field names to include on each subtask.",
    },
    { key: "opt_pretty", label: "Pretty print", type: "boolean" },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/tasks/${input.taskId}/subtasks`, {
      query: {
        limit: input.limit ?? 100,
        offset: input.offset,
        opt_fields: input.opt_fields,
        opt_pretty: input.opt_pretty,
      },
    });
  },
};

export default listSubtasks;
