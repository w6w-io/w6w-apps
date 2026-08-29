import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient, toIdList } from "../lib/client.ts";

interface Input {
  id: string;
  title?: string;
  description?: string;
  state?: "todo" | "in_progress" | "closed";
  assignees?: string;
  team?: string;
  dueAt?: number;
}

/**
 * `PATCH /v1/tasks/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Tasks, 2026-08-29.
 */
const action: ActionDefinition<Input> = {
  key: "task-update",
  type: "perform",
  resource: "task",
  title: "Update Task",
  description: "Update a task's title, description, state, assignees, team, or due date.",
  idempotent: true,
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", default: "", hint: "Max 1000 characters." },
    {
      key: "description",
      label: "Description",
      type: "text",
      default: "",
      hint: "Max 10000 characters.",
    },
    {
      key: "state",
      label: "State",
      type: "select",
      default: "",
      options: [
        { value: "todo", label: "To Do" },
        { value: "in_progress", label: "In Progress" },
        { value: "closed", label: "Closed" },
      ],
    },
    {
      key: "assignees",
      label: "Assignees (comma-separated IDs)",
      type: "string",
      default: "",
    },
    { key: "team", label: "Team ID", type: "string", default: "", advanced: true },
    { key: "dueAt", label: "Due At (Unix timestamp)", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "State" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");

    const task = compact({
      title: input.title,
      description: input.description,
      state: input.state,
      assignees: toIdList(input.assignees).length ? toIdList(input.assignees) : undefined,
      team: input.team,
      due_at: input.dueAt || undefined,
    });

    ctx.log("info", "updating Missive task", { id: input.id });
    const res = await new MissiveClient(ctx).json<{ tasks: unknown }>(
      `/tasks/${encodeURIComponent(input.id)}`,
      { method: "PATCH", body: { tasks: task } },
    );
    return res.tasks;
  },
};

export default action;
