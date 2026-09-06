import type { ActionDefinition } from "@w6w/types";
import { compact, listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

interface Input {
  pageNumber?: number;
  pageSize?: number;
  pendingInvite?: boolean;
  role?: string;
  email?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Team Members",
  description: "List your organization's team member users.",
  params: [
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
    { key: "pendingInvite", label: "Filter: pending invite", type: "boolean" },
    {
      key: "role",
      label: "Filter: role",
      type: "select",
      options: [
        { label: "Host", value: "host" },
        { label: "Moderator", value: "moderator" },
      ],
    },
    { key: "email", label: "Filter: email (case-insensitive)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Team members" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>("/users", {
      query: {
        ...listQuery(input),
        ...compact({
          "filter[pending_invite]": input.pendingInvite,
          "filter[role]": input.role,
          "filter[email]": input.email,
        }),
      },
    });
  },
};

export default userList;
