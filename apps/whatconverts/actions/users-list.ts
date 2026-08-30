import type { ActionDefinition } from "@w6w/types";
import { compact, WhatConvertsClient } from "../lib/client.ts";

interface Input {
  usersPerPage?: number;
  pageNumber?: number;
  startDate?: string;
  endDate?: string;
  order?: "asc" | "desc";
  userType?: "master_account" | "account";
}

/**
 * `GET /users` — a paginated list of users. Requires a Master Account (agency) Key.
 *
 * Verified against `whatconverts.com/api/users/` on 2026-08-29. `user_type` defaults to
 * `master_account`; pass `account` to list the users of the agency's sub-accounts instead.
 */
const usersList: ActionDefinition<Input> = {
  key: "users-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "Get a paginated list of users. Requires a Master Account (agency) Key.",
  params: [
    {
      key: "usersPerPage",
      label: "Users per page",
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
    {
      key: "userType",
      label: "User type",
      type: "select",
      options: [
        { value: "master_account", label: "Master account" },
        { value: "account", label: "Account" },
      ],
      default: "master_account",
      advanced: true,
    },
  ],
  output: [
    { key: "page_number", type: "number", label: "Current page number" },
    { key: "users_per_page", type: "number", label: "Users returned in this request" },
    { key: "total_pages", type: "number", label: "Total pages available" },
    { key: "total_users", type: "number", label: "Total users available" },
    { key: "users", type: "array", label: "Users" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(
      "/users",
      compact({
        users_per_page: input.usersPerPage ?? 25,
        page_number: input.pageNumber,
        start_date: input.startDate,
        end_date: input.endDate,
        order: input.order,
        user_type: input.userType,
      }),
    );
  },
};

export default usersList;
