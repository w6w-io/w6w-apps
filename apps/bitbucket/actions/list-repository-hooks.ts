import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient, type BitbucketListResponse } from "../lib/client.ts";

interface Input {
  workspace: string;
  repoSlug: string;
  page?: number;
  pagelen?: number;
}

const listRepositoryHooks: ActionDefinition<Input> = {
  key: "list-repository-hooks",
  type: "read",
  resource: "hook",
  title: "List Repository Webhooks",
  description: "List webhooks installed on a repository.",
  params: [
    { key: "workspace", label: "Workspace slug", type: "string", required: true },
    { key: "repoSlug", label: "Repository slug", type: "string", required: true },
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
      `/repositories/${input.workspace}/${input.repoSlug}/hooks`,
      { query: { page: input.page, pagelen: input.pagelen ?? 100 } },
    );
  },
};

export default listRepositoryHooks;
