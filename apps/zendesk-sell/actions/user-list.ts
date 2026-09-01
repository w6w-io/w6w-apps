import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient } from "../lib/client.ts";
import { idsParam, paginationParams, sortByParam } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  sortBy?: string;
  ids?: string;
  role?: string;
  status?: string;
  confirmed?: boolean;
  name?: string;
  email?: string;
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List the users on this Sell account. Read-only — Sell's Users API has no write.",
  params: [
    ...paginationParams(),
    sortByParam(["id", "name", "created_at", "updated_at"]),
    idsParam,
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "user", label: "User" },
        { value: "admin", label: "Admin" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    { key: "confirmed", label: "Confirmed only", type: "boolean" },
    { key: "name", label: "Name (exact)", type: "string" },
    { key: "email", label: "Email (exact)", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Count on this page" },
  ],

  async execute(input, ctx) {
    const result = await new SellClient(ctx).list(
      "/users",
      compact({
        page: input.page,
        per_page: input.perPage,
        sort_by: input.sortBy,
        ids: input.ids,
        role: input.role,
        status: input.status,
        confirmed: input.confirmed,
        name: input.name,
        email: input.email,
      }),
    );
    return { items: result.items, count: result.count };
  },
};

export default userList;
