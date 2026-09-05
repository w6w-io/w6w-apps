import type { ActionDefinition } from "@w6w/types";
import { compact, csv, LearnWorldsClient } from "../lib/client.ts";

/**
 * `GET /v2/users` — the school's users, newest first, default 20 per page
 * (up to 200 via `items_per_page`).
 */
interface Input {
  status?: string;
  role?: string;
  tags?: string;
  includeSuspended?: boolean;
  page?: number;
  itemsPerPage?: number;
}

const usersList: ActionDefinition<Input> = {
  key: "users-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List the school's users, most recently registered first.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Paying", value: "paying" },
        { label: "Non-paying", value: "non_paying" },
        { label: "Suspended", value: "suspended" },
        { label: "Never logged in", value: "never_logged_in" },
      ],
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { label: "User", value: "user" },
        { label: "Admin", value: "admin" },
        { label: "Instructor", value: "instructor" },
        { label: "Reporter", value: "reporter" },
        { label: "License reporter", value: "license_reporter" },
      ],
    },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tag names to filter by." },
    {
      key: "includeSuspended",
      label: "Include suspended users",
      type: "boolean",
      default: false,
    },
    { key: "page", label: "Page", type: "number", default: 1 },
    {
      key: "itemsPerPage",
      label: "Items per page",
      type: "number",
      default: 20,
      hint: "1–200.",
      validation: { min: 1, max: 200 },
    },
  ],
  output: [
    { key: "data", type: "array", label: "Users" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new LearnWorldsClient(ctx).request("/v2/users", {
      query: compact({
        status: input.status,
        role: input.role,
        tags: csv(input.tags)?.join(","),
        include_suspended: input.includeSuspended ? "true" : undefined,
        page: input.page,
        items_per_page: input.itemsPerPage,
      }),
    });
  },
};

export default usersList;
