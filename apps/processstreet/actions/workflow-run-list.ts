import type { ActionDefinition } from "@w6w/types";
import { type CursorInput, cursorParams } from "../lib/params.ts";
import { nextCursor, ProcessStreetClient, type PsLink } from "../lib/client.ts";

interface Input extends CursorInput {
  workflowId?: string;
  status?: string;
}

interface WorkflowRunSummary {
  id: string;
  name?: string;
  status: "Active" | "Completed" | "Archived" | "Deleted";
  workflowId: string;
  dueDate?: string;
}

/**
 * `GET /workflow-runs/list` — "List all workflow runs", real cursor pagination via `links[]`.
 * Sorted newest-created first. Prefer this over `workflow-run-search` unless you need the
 * `name`/form-field filters that only the older endpoint supports — see README.
 */
interface Output {
  workflowRuns: WorkflowRunSummary[];
  nextCursor?: string;
}

const workflowRunList: ActionDefinition<Input, Output> = {
  key: "workflow-run-list",
  type: "read",
  resource: "workflow-run",
  title: "List Workflow Runs",
  description:
    "List Workflow Runs (checklists) accessible to the caller, newest first. Fully cursor-paginated.",
  params: [
    { key: "workflowId", label: "Workflow ID", type: "string", hint: "Filter to one Workflow." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Completed", label: "Completed" },
        { value: "Archived", label: "Archived" },
      ],
      hint: "Omit to include all non-deleted runs.",
    },
    ...cursorParams,
  ],
  output: [
    { key: "workflowRuns", type: "array", label: "Workflow Runs" },
    { key: "nextCursor", type: "string", label: "Next cursor" },
  ],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<
      { data: WorkflowRunSummary[]; links?: PsLink[] }
    >("/workflow-runs/list", {
      query: { workflowId: input.workflowId, status: input.status, _: input.cursor },
    });
    return { workflowRuns: data.data, nextCursor: nextCursor(data.links) };
  },
};

export default workflowRunList;
