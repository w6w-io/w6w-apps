import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  customer?: string;
  domain?: string;
  userKey?: string;
  query?: string;
  maxResults?: number;
  pageToken?: string;
}

const listGroups: ActionDefinition<Input> = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List groups in the domain (one page).",
  params: [
    {
      key: "customer",
      label: "Customer ID",
      type: "string",
      default: "my_customer",
      hint: "`my_customer` refers to the connected account's own Workspace customer.",
    },
    { key: "domain", label: "Domain", type: "string" },
    {
      key: "userKey",
      label: "Member email or ID",
      type: "string",
      hint: "Restrict to groups this user belongs to.",
    },
    { key: "query", label: "Query", type: "string" },
    { key: "maxResults", label: "Page size", type: "number", default: 200 },
    { key: "pageToken", label: "Page token", type: "string" },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    return client.request("/groups", {
      query: {
        customer: input.domain || input.userKey ? undefined : (input.customer ?? "my_customer"),
        domain: input.domain,
        userKey: input.userKey,
        query: input.query,
        maxResults: input.maxResults ?? 200,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listGroups;
