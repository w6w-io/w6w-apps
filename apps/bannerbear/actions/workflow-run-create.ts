import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BannerbearClient, compact } from "../lib/client.ts";
import { metadataParam } from "../lib/params.ts";

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
  workflow: string;
  inputs?: unknown;
  metadata?: string;
}

/**
 * `POST /workflow_runs` — start a Workflow. Always async; poll
 * `workflow-run-get` or subscribe a `resource: "workflow_run"` Webhook.
 * "A run charges nothing itself: each step is billed as the resource it
 * creates" — the vendor's own note, worth repeating because it means running
 * the same workflow N times costs exactly what running its steps
 * individually N times would, not a separate workflow fee. To process many
 * rows, start one run per row rather than trying to batch rows into one run.
 */
const action: ActionDefinition<Input, WorkflowRun> = {
  key: "workflow-run-create",
  type: "perform",
  resource: "workflow-run",
  title: "Run Workflow",
  description:
    "Start a Workflow with the inputs it declares (see workflow-get). Not idempotent — every " +
    "call starts a new run. To process many rows, call this once per row.",
  idempotent: false,
  params: [
    { key: "workflow", label: "Workflow UID", type: "string", required: true },
    {
      key: "inputs",
      label: "Inputs",
      type: "json",
      hint: 'Values for the workflow\'s declared inputs, e.g. `{"headline":"Hello"}` — see ' +
        "workflow-get for the names, types, and which are required.",
    },
    metadataParam,
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "status", type: "string", label: "Status" },
    { key: "progress", type: "number", label: "Progress (% of steps completed)" },
    { key: "outputs", type: "object", label: "Each completed step's output, keyed by step name" },
  ],

  async execute(input, ctx) {
    const workflow = String(input.workflow ?? "").trim();
    if (!workflow) throw new Error("`workflow` is required");

    return await new BannerbearClient(ctx).json<WorkflowRun>("/workflow_runs", {
      method: "POST",
      body: compact({
        workflow,
        inputs: asOptionalJson(input.inputs, "inputs"),
        metadata: input.metadata,
      }),
    });
  },
};

export default action;
