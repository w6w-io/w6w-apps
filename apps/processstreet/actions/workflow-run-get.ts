import type { ActionDefinition } from "@w6w/types";
import { ProcessStreetClient } from "../lib/client.ts";

interface Input {
  workflowRunId: string;
}

interface WorkflowRun {
  id: string;
  name?: string;
  status: "Active" | "Completed" | "Archived" | "Deleted";
  workflowId: string;
  dueDate?: string;
  shared: boolean;
}

/** `GET /workflow-runs/{workflowRunId}` — a single Workflow Run by id. */
interface Output {
  workflowRun: WorkflowRun;
}

const workflowRunGet: ActionDefinition<Input, Output> = {
  key: "workflow-run-get",
  type: "read",
  resource: "workflow-run",
  title: "Get Workflow Run",
  description: "Read a single Workflow Run (checklist) by id.",
  params: [
    { key: "workflowRunId", label: "Workflow Run ID", type: "string", required: true },
  ],
  output: [{ key: "workflowRun", type: "object", label: "Workflow Run" }],

  async execute(input, ctx) {
    const { data } = await new ProcessStreetClient(ctx).request<WorkflowRun>(
      `/workflow-runs/${encodeURIComponent(input.workflowRunId)}`,
    );
    return { workflowRun: data };
  },
};

export default workflowRunGet;
