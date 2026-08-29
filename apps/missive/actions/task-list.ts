import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  until?: number;
  organization?: string;
  team?: string;
  assignee?: string;
  state?: "todo" | "in_progress" | "closed";
  type?: "task" | "conversation" | "all";
  conversation?: string;
  dueAtGteq?: number;
  dueAtLteq?: number;
}

/**
 * `GET /v1/tasks` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Tasks, 2026-08-29.
 *
 * Ordered by last activity (newest first). Paginate with `until` set to the
 * `last_activity_at` of the last task returned, minus 1 (it's inclusive, so
 * subtracting avoids returning the same task twice).
 */
const action: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description: "List tasks and tasked conversations, newest activity first.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 10, hint: "Min: 2, max: 50." },
    {
      key: "until",
      label: "Until (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Use the last last_activity_at minus 1, to avoid a duplicate on the next page.",
    },
    { key: "organization", label: "Organization ID", type: "string", default: "" },
    { key: "team", label: "Team ID", type: "string", default: "" },
    { key: "assignee", label: "Assignee User ID", type: "string", default: "" },
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
      key: "type",
      label: "Type",
      type: "select",
      default: "all",
      advanced: true,
      options: [
        { value: "task", label: "Tasks only (subtasks or standalone)" },
        { value: "conversation", label: "Tasked conversations only" },
        { value: "all", label: "Both (default)" },
      ],
    },
    {
      key: "conversation",
      label: "Parent Conversation ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Return subtasks of this conversation.",
    },
    {
      key: "dueAtGteq",
      label: "Due At >= (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
    },
    {
      key: "dueAtLteq",
      label: "Due At <= (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
    },
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
  ],

  async execute(input, ctx) {
    const res = await new MissiveClient(ctx).json<{ tasks: unknown[] }>("/tasks", {
      query: compact({
        limit: input.limit,
        until: input.until,
        organization: input.organization,
        team: input.team,
        assignee: input.assignee,
        state: input.state,
        type: input.type,
        conversation: input.conversation,
        due_at_gteq: input.dueAtGteq,
        due_at_lteq: input.dueAtLteq,
      }),
    });
    return res.tasks;
  },
};

export default action;
