import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  domain?: string;
  ownerId?: number;
  archived?: boolean;
  perPage?: number;
  page?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

/** GET /v2/accounts — list/filter accounts. */
const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description: "List and filter accounts.",
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      hint: "Exact match; domains are unique and lowercase.",
    },
    { key: "ownerId", label: "Owner (user ID)", type: "number" },
    { key: "archived", label: "Archived only", type: "boolean" },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "1–100." },
    { key: "page", label: "Page", type: "number", default: 1 },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
        { value: "last_contacted_at", label: "Last contacted at" },
        { value: "account_name", label: "Account name" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      advanced: true,
      options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Accounts" },
    { key: "metadata", type: "object", label: "Paging metadata" },
  ],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/accounts", {
      query: compact({
        domain: input.domain,
        owner_id: input.ownerId,
        archived: input.archived,
        per_page: input.perPage,
        page: input.page,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      }),
    });
  },
};

export default accountList;
