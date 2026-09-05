import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  groupKey: string;
  roles?: string;
  maxResults?: number;
  pageToken?: string;
  includeDerivedMembership?: boolean;
}

const listMembers: ActionDefinition<Input> = {
  key: "member-list",
  type: "search",
  resource: "member",
  title: "List Group Members",
  description: "List the members of a group (one page).",
  params: [
    { key: "groupKey", label: "Group Key", type: "string", required: true },
    {
      key: "roles",
      label: "Roles",
      type: "string",
      hint: "Comma-separated: OWNER, MANAGER, MEMBER. Omit for all roles.",
    },
    { key: "maxResults", label: "Page size", type: "number", default: 200 },
    { key: "pageToken", label: "Page token", type: "string" },
    {
      key: "includeDerivedMembership",
      label: "Include derived (nested group) membership",
      type: "boolean",
      default: false,
    },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    return client.request(`/groups/${encodeURIComponent(input.groupKey)}/members`, {
      query: {
        roles: input.roles,
        maxResults: input.maxResults ?? 200,
        pageToken: input.pageToken,
        includeDerivedMembership: input.includeDerivedMembership ? "true" : undefined,
      },
    });
  },
};

export default listMembers;
