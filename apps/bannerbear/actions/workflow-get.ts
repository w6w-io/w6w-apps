import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface Workflow {
  uid: string;
  name: string;
  description?: string | null;
  tags?: string[];
  inputs?: Record<string, { type?: string; required?: boolean }>;
  steps?: Array<{ key?: string; type?: string; ref?: string; label?: string; inputs?: unknown }>;
}

interface Input {
  uid: string;
}

/**
 * `GET /workflows/{uid}` — a Workflow's declared `inputs` (what
 * `workflow-run-create` accepts) and its `steps` in run order, with each
 * step's own `{{inputs.x}}` / `{{steps.x.y}}` template references left
 * unresolved.
 */
const action: ActionDefinition<Input, Workflow> = {
  key: "workflow-get",
  type: "read",
  resource: "workflow",
  title: "Get Workflow",
  description: "Get a Workflow's declared inputs and its steps in run order.",
  params: [
    { key: "uid", label: "Workflow UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "name", type: "string", label: "Name" },
    { key: "inputs", type: "object", label: "Declared inputs" },
    { key: "steps", type: "array", label: "Steps" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<Workflow>(`/workflows/${encodeURIComponent(uid)}`);
  },
};

export default action;
