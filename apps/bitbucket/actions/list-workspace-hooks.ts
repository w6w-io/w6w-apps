import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient, type BitbucketListResponse } from "../lib/client.ts";

interface Input {
  workspace: string;
  page?: number;
  pagelen?: number;
}

const listWorkspaceHooks: ActionDefinition<Input> = {
  key: "list-workspace-hooks",
  type: "read",
  resource: "hook",
  title: "List Workspace Webhooks",
  description: "List webhooks installed on a workspace.",
  params: [
    { key: "workspace", label: "Workspace slug", type: "string", required: true },
    { key: "page", label: "Page", type: "number" },
    { key: "pagelen", label: "Page size", type: "number", default: 100 },
  ],
  output: [
    { key: "values", type: "array", label: "Webhooks" },
    { key: "next", type: "string", label: "Next page URL" },
  ],

  async execute(input, ctx) {
    const client = new BitbucketClient(ctx);
    return client.request<BitbucketListResponse>(
      `/workspaces/${input.workspace}/hooks`,
      { query: { page: input.page, pagelen: input.pagelen ?? 100 } },
    );
  },
};

export default listWorkspaceHooks;
