import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient, type BitbucketListResponse } from "../lib/client.ts";

interface Input {
  workspace: string;
  role?: "owner" | "admin" | "contributor" | "member";
  q?: string;
  sort?: string;
  page?: number;
  pagelen?: number;
}

const listRepositories: ActionDefinition<Input> = {
  key: "list-repositories",
  type: "read",
  resource: "repository",
  title: "List Repositories",
  description: "List repositories in a workspace.",
  params: [
    { key: "workspace", label: "Workspace slug", type: "string", required: true },
    {
      key: "role",
      label: "Role filter",
      type: "select",
      options: [
        { value: "owner", label: "Owner" },
        { value: "admin", label: "Admin" },
        { value: "contributor", label: "Contributor" },
        { value: "member", label: "Member" },
      ],
    },
    { key: "q", label: "BBQL filter", type: "string" },
    { key: "sort", label: "Sort field", type: "string" },
    { key: "page", label: "Page", type: "number" },
    { key: "pagelen", label: "Page size", type: "number", default: 100 },
  ],
  output: [
    { key: "values", type: "array", label: "Repositories" },
    { key: "next", type: "string", label: "Next page URL" },
  ],

  async execute(input, ctx) {
    const client = new BitbucketClient(ctx);
    return client.request<BitbucketListResponse>(
      `/repositories/${input.workspace}`,
      {
        query: {
          role: input.role,
          q: input.q,
          sort: input.sort,
          page: input.page,
          pagelen: input.pagelen ?? 100,
        },
      },
    );
  },
};

export default listRepositories;
