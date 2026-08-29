import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface WorkflowRun {
  uid: string;
  status: "queued" | "running" | "completed" | "failed";
  workflow: string;
  progress?: number;
  created_at?: string;
}

interface Input {
  page?: number;
}

/** `GET /workflow_runs` — recent workflow runs, one page at a time. */
const action: ActionDefinition<Input, WorkflowRun[]> = {
  key: "workflow-run-list",
  type: "read",
  resource: "workflow-run",
  title: "List Workflow Runs",
  description: "List workflow runs in the workspace.",
  params: [pageParam],
  output: [{ key: "workflowRuns", type: "array", label: "Workflow runs" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<WorkflowRun[]>("/workflow_runs", {
      query: { page: input.page },
    });
  },
};

export default action;
