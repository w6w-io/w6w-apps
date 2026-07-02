import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
  opt_fields?: string;
  opt_pretty?: boolean;
}

const getTask: ActionDefinition<Input> = {
  key: "get-task",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Retrieve a single task by ID.",
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    {
      key: "opt_fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated field names to include.",
    },
    { key: "opt_pretty", label: "Pretty print", type: "boolean" },
  ],

  async execute(input, ctx) {
    return new AsanaClient(ctx).request(`/tasks/${input.id}`, {
      query: {
        opt_fields: input.opt_fields,
        opt_pretty: input.opt_pretty,
      },
    });
  },
};

export default getTask;
