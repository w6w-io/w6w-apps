import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

interface ToolJob {
  uid: string;
  tool: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  metadata?: string | null;
  self?: string;
  created_at?: string;
  completed_at?: string | null;
  error_message?: string | null;
}

interface Input {
  uid: string;
}

/** `GET /tool_jobs/{uid}` — poll a job started by any of the 16 `tool-*` actions. */
const action: ActionDefinition<Input, ToolJob> = {
  key: "tool-job-get",
  type: "read",
  resource: "tool-job",
  title: "Get Tool Job",
  description: "Poll a Tool job's status, progress, and outputs.",
  params: [
    { key: "uid", label: "Tool job UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "tool", type: "string", label: "Tool" },
    { key: "status", type: "string", label: "Status" },
    { key: "progress", type: "number", label: "Progress (0-100)" },
    { key: "outputs", type: "object", label: "Outputs" },
    { key: "error_message", type: "string", label: "Error (on failure)" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<ToolJob>(`/tool_jobs/${encodeURIComponent(uid)}`);
  },
};

export default action;
