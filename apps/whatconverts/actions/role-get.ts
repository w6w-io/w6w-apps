import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";

interface Input {
  roleId: number;
}

/**
 * `GET /roles/{role_id}` — details for a single role, including its full permission grid.
 * Requires a Master Account (agency) Key.
 *
 * Verified against `whatconverts.com/api/roles/` on 2026-08-29. `accounts`, `billing`,
 * `security` and `users` permissions only apply to `master_account_role`; every other
 * permission applies to both role types.
 */
const roleGet: ActionDefinition<Input> = {
  key: "role-get",
  type: "read",
  resource: "role",
  title: "Get Role",
  description: "Get details and permissions for a single role. Requires a Master Account " +
    "(agency) Key.",
  params: [
    { key: "roleId", label: "Role ID", type: "number", required: true },
  ],
  output: [
    { key: "role_id", type: "number", label: "Role ID" },
    { key: "role_type", type: "string", label: "master_account_role or account_role" },
    { key: "role_name", type: "string", label: "Role name" },
    { key: "lead_notifications", type: "boolean", label: "Can receive lead notifications" },
    {
      key: "permissions",
      type: "object",
      label: "Permissions — none/view/edit per area (integrations, leads, profiles, " +
        "reports, settings, tracking, and, master-account-only, accounts, billing, " +
        "security, users)",
    },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(`/roles/${input.roleId}`);
  },
};

export default roleGet;
