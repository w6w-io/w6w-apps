import type { ActionDefinition } from "@w6w/types";
import { compact, WhatConvertsClient } from "../lib/client.ts";

interface Input {
  rolesPerPage?: number;
  pageNumber?: number;
  order?: "asc" | "desc";
  roleType?: "master_account" | "account";
}

/**
 * `GET /roles` — a paginated list of user roles. Requires a Master Account (agency) Key.
 *
 * Verified against `whatconverts.com/api/roles/` on 2026-08-29. The list response is
 * intentionally sparse (`role_id`, `role_type`, `role_name`) — the full permission grid is
 * only returned by `role-get`.
 */
const rolesList: ActionDefinition<Input> = {
  key: "roles-list",
  type: "read",
  resource: "role",
  title: "List Roles",
  description: "Get a paginated list of roles. Requires a Master Account (agency) Key.",
  params: [
    {
      key: "rolesPerPage",
      label: "Roles per page",
      type: "number",
      default: 25,
      hint: "Vendor default 25, maximum 250.",
    },
    { key: "pageNumber", label: "Page number", type: "number" },
    {
      key: "order",
      label: "Order by name",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      default: "asc",
      advanced: true,
    },
    {
      key: "roleType",
      label: "Role type",
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
    { key: "roles_per_page", type: "number", label: "Roles returned in this request" },
    { key: "total_pages", type: "number", label: "Total pages available" },
    { key: "total_roles", type: "number", label: "Total roles available" },
    { key: "roles", type: "array", label: "Roles" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(
      "/roles",
      compact({
        roles_per_page: input.rolesPerPage ?? 25,
        page_number: input.pageNumber,
        order: input.order,
        role_type: input.roleType,
      }),
    );
  },
};

export default rolesList;
