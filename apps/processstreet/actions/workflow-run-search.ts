import type { ActionDefinition } from "@w6w/types";
import { ProcessStreetClient } from "../lib/client.ts";

interface Input {
  workflowId?: string;
  name?: string;
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
 * `GET /workflow-runs` — "Search workflow runs". Returns "the latest 200 workflow runs of a
 * workflow, showing the most recently updated first". **NOT cursor-paginated** — no `_` param, no
 * `links[]` cursor at all, capped hard at 200 results. This is a genuinely different, older
 * operation from `workflow-run-list` (`GET /workflow-runs/list`), which IS fully paginated but
 * cannot filter by `name` or by collected form-field values. Use this action only when you need
 * that filtering and 200 results is enough; use `workflow-run-list` for anything that must see
 * every run. See README.
 */
interface Output {
  workflowRuns: WorkflowRunSummary[];
}

const workflowRunSearch: ActionDefinition<Input, Output> = {
  key: "workflow-run-search",
  type: "search",
  resource: "workflow-run",
  title: "Search Workflow Runs",
  description:
    "Search Workflow Runs by name/status, most-recently-updated first. Capped at the latest " +
    "200 results — NOT paginated. Use List Workflow Runs to see everything.",
  params: [
    { key: "workflowId", label: "Workflow ID", type: "string", hint: "Filter to one Workflow." },
    {
      key: "name",
      label: "Name contains",
      type: "string",
      hint: "Case-insensitive partial match.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Active, Completed or Archived. Comma-separated for multiple. Defaults to Active.",
    },
  ],
  output: [{ key: "workflowRuns", type: "array", label: "Workflow Runs" }],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<
      { workflowRuns: WorkflowRunSummary[] }
    >("/workflow-runs", {
      query: { workflowId: input.workflowId, name: input.name, status: input.status },
    });
    return { workflowRuns: data.workflowRuns };
  },
};

export default workflowRunSearch;
