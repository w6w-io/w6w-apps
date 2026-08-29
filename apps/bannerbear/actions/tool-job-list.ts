import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

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
  page?: number;
}

/**
 * `GET /tool_jobs` — every `/tools/*` run, any tool, any status, one page at
 * a time. `outputs` shape varies per tool; see each `tool-*` action for its
 * concrete keys.
 */
const action: ActionDefinition<Input, ToolJob[]> = {
  key: "tool-job-list",
  type: "read",
  resource: "tool-job",
  title: "List Tool Jobs",
  description: "List Tool jobs across every tool, newest first.",
  params: [pageParam],
  output: [{ key: "toolJobs", type: "array", label: "Tool jobs" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<ToolJob[]>("/tool_jobs", {
      query: { page: input.page },
    });
  },
};

export default action;
