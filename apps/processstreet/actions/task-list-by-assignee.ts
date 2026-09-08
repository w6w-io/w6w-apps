import type { ActionDefinition } from "@w6w/types";
import { type CursorInput, cursorParams } from "../lib/params.ts";
import { nextCursor, ProcessStreetClient, type PsLink } from "../lib/client.ts";

interface Input extends CursorInput {
  assigneeEmail: string;
  workflowId?: string;
}

interface TaskSummary {
  id: string;
  name: string;
  status: "NotCompleted" | "Completed";
  workflowRunId: string;
  dueDate?: string;
}

/**
 * `GET /tasks` — "List all tasks", across every Workflow Run, sorted by due date. Unlike
 * `task-list`, `assigneeEmail` is REQUIRED by the spec (there is no "list every task in the
 * account" call) — this is a cross-workflow "what's assigned to X" lookup, not a general task
 * search.
 */
interface Output {
  tasks: TaskSummary[];
  nextCursor?: string;
}

const taskListByAssignee: ActionDefinition<Input, Output> = {
  key: "task-list-by-assignee",
  type: "read",
  resource: "task",
  title: "List Tasks by Assignee",
  description: "List tasks assigned to one user, across every Workflow Run, sorted by due date.",
  params: [
    { key: "assigneeEmail", label: "Assignee email", type: "string", required: true },
    {
      key: "workflowId",
      label: "Workflow ID",
      type: "string",
      hint: "Optionally filter to one Workflow.",
    },
    ...cursorParams,
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "nextCursor", type: "string", label: "Next cursor" },
  ],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<
      { tasks: TaskSummary[]; links?: PsLink[] }
    >("/tasks", {
      query: { assigneeEmail: input.assigneeEmail, workflowId: input.workflowId, _: input.cursor },
    });
    return { tasks: data.tasks, nextCursor: nextCursor(data.links) };
  },
};

export default taskListByAssignee;
