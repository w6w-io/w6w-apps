import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface WorkflowRun {
  uid: string;
  status: "queued" | "running" | "completed" | "failed";
  workflow: string;
  progress?: number;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  metadata?: string | null;
  steps?: unknown[];
}

interface Input {
  uid: string;
}

/** `GET /workflow_runs/{uid}` — poll a run started by `workflow-run-create`. */
const action: ActionDefinition<Input, WorkflowRun> = {
  key: "workflow-run-get",
  type: "read",
  resource: "workflow-run",
  title: "Get Workflow Run",
  description: "Poll a workflow run's status, progress, and per-step outputs.",
  params: [
    { key: "uid", label: "Workflow run UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "status", type: "string", label: "Status" },
    { key: "progress", type: "number", label: "Progress (% of steps completed)" },
    { key: "outputs", type: "object", label: "Each completed step's output, keyed by step name" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<WorkflowRun>(
      `/workflow_runs/${encodeURIComponent(uid)}`,
    );
  },
};

export default action;
