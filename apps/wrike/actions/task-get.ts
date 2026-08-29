import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, joinIds, WrikeClient } from "../lib/client.ts";

/**
 * `GET /tasks/{taskIds}` — complete information about one or more tasks.
 *
 * Accepts up to 1000 comma-separated ids in a single call (Wrike's own
 * documented limit) — pass several to avoid round-tripping one task at a time.
 */
interface Input {
  taskIds: string | string[];
  withInvitations?: boolean;
}

const taskGet: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Tasks by ID",
  description: "Fetch complete information about one or more tasks by ID.",
  params: [
    {
      key: "taskIds",
      label: "Task ID(s)",
      type: "string",
      required: true,
      hint: "One task ID, or several comma-separated (up to 1000).",
    },
    {
      key: "withInvitations",
      label: "Include invitations",
      type: "boolean",
      advanced: true,
      hint: "Include pending invitations in sharedIds/responsibleIds lists.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Tasks" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list(`/tasks/${joinIds(input.taskIds)}`, {
      query: { withInvitations: input.withInvitations },
    });
    return { items };
  },
};

export default taskGet;
