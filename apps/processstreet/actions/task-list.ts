import type { ActionDefinition } from "@w6w/types";
import { type CursorInput, cursorParams } from "../lib/params.ts";
import { nextCursor, ProcessStreetClient, type PsLink } from "../lib/client.ts";

interface Input extends CursorInput {
  workflowRunId: string;
}

interface TaskSummary {
  id: string;
  name: string;
  status: "NotCompleted" | "Completed";
  workflowRunId: string;
  hidden: boolean;
  stopped: boolean;
  dueDate?: string;
}

/** `GET /workflow-runs/{workflowRunId}/tasks` — every task in one Workflow Run, cursor-paginated. */
interface Output {
  tasks: TaskSummary[];
  nextCursor?: string;
}

const taskList: ActionDefinition<Input, Output> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks in Workflow Run",
  description: "List the tasks belonging to one Workflow Run.",
  params: [
    { key: "workflowRunId", label: "Workflow Run ID", type: "string", required: true },
    ...cursorParams,
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "nextCursor", type: "string", label: "Next cursor" },
  ],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<
      { tasks: TaskSummary[]; links?: PsLink[] }
    >(`/workflow-runs/${encodeURIComponent(input.workflowRunId)}/tasks`, {
      query: { _: input.cursor },
    });
    return { tasks: data.tasks, nextCursor: nextCursor(data.links) };
  },
};

export default taskList;
