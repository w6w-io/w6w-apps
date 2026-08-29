import type { ActionDefinition } from "@w6w/types";
import { MissiveClient, unwrapSingle } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `GET /v1/tasks/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Tasks, 2026-08-29.
 *
 * Unlike List Tasks (which returns bare id strings for `assignees`/`team`),
 * this returns the full user objects and full team object.
 */
const action: ActionDefinition<Input> = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get Task",
  description: "Get a single task with full assignee and team details.",
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "State" },
    { key: "assignees", type: "array", label: "Assignees (full user objects)" },
    { key: "team", type: "object", label: "Team (full team object)" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");
    const res = await new MissiveClient(ctx).json<{ tasks: unknown }>(
      `/tasks/${encodeURIComponent(input.id)}`,
    );
    return unwrapSingle(res.tasks);
  },
};

export default action;
