import type { ActionDefinition } from "@w6w/types";
import { compact, WhatConvertsClient } from "../lib/client.ts";

interface Input {
  accountsPerPage?: number;
  pageNumber?: number;
  startDate?: string;
  endDate?: string;
  order?: "asc" | "desc";
}

/**
 * `GET /accounts` — a paginated list of the accounts (sub-clients) under an agency.
 *
 * Verified against `whatconverts.com/api/accounts/` on 2026-08-29. The page states
 * plainly: "Agency Key is required to access this resource" — a Profile Key connection
 * will be refused here regardless of what it can otherwise reach.
 */
const accountsList: ActionDefinition<Input> = {
  key: "accounts-list",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description: "Get a paginated list of accounts. Requires a Master Account (agency) Key.",
  params: [
    {
      key: "accountsPerPage",
      label: "Accounts per page",
      type: "number",
      default: 25,
      hint: "Vendor default 25, maximum 250.",
    },
    { key: "pageNumber", label: "Page number", type: "number" },
    { key: "startDate", label: "Start date", type: "string", advanced: true },
    { key: "endDate", label: "End date", type: "string", advanced: true },
    {
      key: "order",
      label: "Order by date created",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      default: "desc",
      advanced: true,
    },
  ],
  output: [
    { key: "page_number", type: "number", label: "Current page number" },
    { key: "accounts_per_page", type: "number", label: "Accounts returned in this request" },
    { key: "total_pages", type: "number", label: "Total pages available" },
    { key: "total_accounts", type: "number", label: "Total accounts available" },
    { key: "accounts", type: "array", label: "Accounts" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(
      "/accounts",
      compact({
        accounts_per_page: input.accountsPerPage ?? 25,
        page_number: input.pageNumber,
        start_date: input.startDate,
        end_date: input.endDate,
        order: input.order,
      }),
    );
  },
};

export default accountsList;
