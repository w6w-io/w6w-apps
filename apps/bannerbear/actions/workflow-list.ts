import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface Workflow {
  uid: string;
  name: string;
  description?: string | null;
  tags?: string[];
  inputs?: Record<string, { type?: string; required?: boolean }>;
  steps?: Array<{ key?: string; type?: string; ref?: string; label?: string }>;
  ui_write_access?: string;
  api_write_access?: string;
  created_at?: string;
}

interface Input {
  page?: number;
}

/**
 * `GET /workflows` — multi-step pipelines built in the Bannerbear dashboard,
 * each chaining tool/image/animation steps server-side. Read-only from this
 * API; a Workflow's steps can only be authored in the dashboard.
 */
const action: ActionDefinition<Input, Workflow[]> = {
  key: "workflow-list",
  type: "read",
  resource: "workflow",
  title: "List Workflows",
  description: "List Workflows defined in the workspace.",
  params: [pageParam],
  output: [{ key: "workflows", type: "array", label: "Workflows" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<Workflow[]>("/workflows", {
      query: { page: input.page },
    });
  },
};

export default action;
