import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, WhatConvertsClient } from "../lib/client.ts";

interface Input {
  userId: number;
  roleId?: number;
  newAccountNotifications?: unknown;
  accounts?: unknown;
}

interface Output {
  user_id: number;
  email: string;
  accounts?: unknown;
}

/**
 * `POST /users` — edit an existing user. Requires a Master Account (agency) Key.
 *
 * Same endpoint as `user-create` (`POST /users`); WhatConverts distinguishes edit from
 * create by the presence of `user_id` in the JSON body, per
 * `whatconverts.com/api/users/` ("Edit an existing user... The body of the request must
 * contain a JSON object with the following fields", `user_id` required). Verified
 * 2026-08-29.
 *
 * Per an `accounts` entry, setting `role_id: false` REMOVES that account's access —
 * the vendor's own documented way to revoke, not a value this app treats specially.
 */
const userUpdate: ActionDefinition<Input, Output> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Edit an existing user's role and account access. Requires a Master " +
    "Account (agency) Key.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    {
      key: "roleId",
      label: "Role ID",
      type: "number",
      hint: "master_account_user only.",
    },
    {
      key: "newAccountNotifications",
      label: "New-account notification defaults",
      type: "json",
      advanced: true,
      hint: "master_account_user only.",
    },
    {
      key: "accounts",
      label: "Account access",
      type: "json",
      advanced: true,
      hint: "Array of account access grants/edits, e.g. " +
        '[{"account_id": 123, "role_id": 456, "reports": true}]. Set role_id to false ' +
        "on an entry to revoke that account's access.",
    },
  ],
  output: [
    { key: "user_id", type: "number", label: "User ID" },
    { key: "email", type: "string", label: "Email address" },
    { key: "accounts", type: "array", label: "The user's current account access" },
  ],

  async execute(input, ctx) {
    const body = compact({
      user_id: input.userId,
      role_id: input.roleId,
      new_account_notifications: asOptionalJson(
        input.newAccountNotifications,
        "newAccountNotifications",
      ),
      accounts: asOptionalJson(input.accounts, "accounts"),
    });
    return await new WhatConvertsClient(ctx).post("/users", body);
  },
};

export default userUpdate;
