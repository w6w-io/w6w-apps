import type { ActionDefinition } from "@w6w/types";
import { GoogleAdminClient } from "../lib/client.ts";

interface Input {
  customer?: string;
  domain?: string;
  query?: string;
  maxResults?: number;
  pageToken?: string;
  orderBy?: string;
  sortOrder?: string;
  showDeleted?: boolean;
}

/**
 * `GET /users` — either `customer` or `domain` is required by the vendor; we
 * default `customer` to the `my_customer` alias so a caller doing the common
 * "list everyone in my Workspace" case needs no lookup first.
 */
const listUsers: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List users in the domain (one page). Requires a Workspace admin credential.",
  params: [
    {
      key: "customer",
      label: "Customer ID",
      type: "string",
      default: "my_customer",
      hint: "`my_customer` refers to the connected account's own Workspace customer.",
    },
    {
      key: "domain",
      label: "Domain",
      type: "string",
      hint: "Restrict to one domain of a multi-domain account. Overrides Customer ID when set.",
    },
    {
      key: "query",
      label: "Query",
      type: "string",
      hint: "Directory search syntax, e.g. `email:foo* orgUnitPath=/Sales`.",
    },
    { key: "maxResults", label: "Page size", type: "number", default: 100 },
    { key: "pageToken", label: "Page token", type: "string" },
    { key: "orderBy", label: "Order by", type: "string" },
    { key: "sortOrder", label: "Sort order", type: "string" },
    { key: "showDeleted", label: "Show deleted users", type: "boolean", default: false },
  ],

  execute(input, ctx) {
    const client = new GoogleAdminClient(ctx);
    return client.request("/users", {
      query: {
        customer: input.domain ? undefined : (input.customer ?? "my_customer"),
        domain: input.domain,
        query: input.query,
        maxResults: input.maxResults ?? 100,
        pageToken: input.pageToken,
        orderBy: input.orderBy,
        sortOrder: input.sortOrder,
        showDeleted: input.showDeleted ? "true" : undefined,
      },
    });
  },
};

export default listUsers;
