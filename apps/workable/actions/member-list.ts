import type { ActionDefinition } from "@w6w/types";
import { compact, WorkableClient } from "../lib/client.ts";

interface Input {
  role?: string;
  shortcode?: string;
  email?: string;
  name?: string;
  status?: string;
  limit?: number;
  sinceId?: string;
  maxId?: string;
}

const memberList: ActionDefinition<Input> = {
  key: "member-list",
  type: "read",
  resource: "member",
  title: "List Members",
  description:
    "List the account's hiring members — the ids `candidate-move` and `candidate-disqualify` " +
    "need for their Acting Member field. Required scope: `r_jobs`.",
  params: [
    {
      key: "role",
      label: "Role",
      type: "select",
      row: "filter",
      options: [
        { value: "simple", label: "Simple" },
        { value: "admin", label: "Admin" },
        { value: "reviewer", label: "Reviewer" },
      ],
    },
    { key: "shortcode", label: "Job shortcode", type: "string", row: "filter" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "all", label: "All" },
      ],
    },
    { key: "email", label: "Email", type: "string", advanced: true },
    { key: "name", label: "Full name (exact match)", type: "string", advanced: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      advanced: true,
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "sinceId", label: "Since ID", type: "string", advanced: true },
    { key: "maxId", label: "Max ID", type: "string", advanced: true },
  ],
  output: [
    { key: "members", type: "array", label: "Members" },
  ],

  async execute(input, ctx) {
    const page = await new WorkableClient(ctx).list("/members", "members", {
      query: compact({
        role: input.role,
        shortcode: input.shortcode,
        email: input.email,
        name: input.name,
        status: input.status,
        limit: input.limit,
        since_id: input.sinceId,
        max_id: input.maxId,
      }),
    });
    return { members: page.items };
  },
};

export default memberList;
