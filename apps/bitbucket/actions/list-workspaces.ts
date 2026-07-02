import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient, type BitbucketListResponse } from "../lib/client.ts";

interface Input {
  role?: "owner" | "collaborator" | "member";
  q?: string;
  sort?: string;
  page?: number;
  pagelen?: number;
}

const listWorkspaces: ActionDefinition<Input> = {
  key: "list-workspaces",
  type: "read",
  resource: "workspace",
  title: "List Workspaces",
  description: "List workspaces the connected user belongs to.",
  params: [
    {
      key: "role",
      label: "Role filter",
      type: "select",
      options: [
        { value: "owner", label: "Owner" },
        { value: "collaborator", label: "Collaborator" },
        { value: "member", label: "Member" },
      ],
    },
    { key: "q", label: "BBQL filter", type: "string", hint: "e.g. `slug = \"acme\"`" },
    { key: "sort", label: "Sort field", type: "string" },
    { key: "page", label: "Page", type: "number" },
    { key: "pagelen", label: "Page size", type: "number", default: 100 },
  ],
  output: [
    { key: "values", type: "array", label: "Workspaces" },
    { key: "next", type: "string", label: "Next page URL" },
  ],

  async execute(input, ctx) {
    const client = new BitbucketClient(ctx);
    return client.request<BitbucketListResponse>(`/user/workspaces`, {
      query: {
        role: input.role,
        q: input.q,
        sort: input.sort,
        page: input.page,
        pagelen: input.pagelen ?? 100,
      },
    });
  },
};

export default listWorkspaces;
