import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, WhatConvertsClient } from "../lib/client.ts";

interface Input {
  userType: "master_account_user" | "account_user";
  email: string;
  roleId?: number;
  newAccountNotifications?: unknown;
  accounts?: unknown;
}

interface Output {
  user_id: number;
  user_type: string;
  email: string;
  pending_activation: boolean;
  date_created: string;
  role_id?: number;
  role_name?: string;
}

/**
 * `POST /users` — invite a new user. Requires a Master Account (agency) Key.
 *
 * Verified against `whatconverts.com/api/users/` on 2026-08-29, the one resource in this
 * app whose docs state the wire format explicitly: "The body of the request must contain a
 * JSON object with the following fields."
 *
 * `newAccountNotifications` and `accounts` are genuinely nested JSON, not flat form
 * fields — `new_account_notifications` is a flags object
 * (`{"reports": true, "phone_calls": false, ...}`, `master_account_user` only), and
 * `accounts` is an array of `{account_id, role_id, ...same flags}` granting per-account
 * access and its own notification settings. Both are accepted here as `json` params rather
 * than being flattened into dozens of individual fields, matching their shape on the wire.
 *
 * The vendor documents `role_id` as belonging to the top level only for
 * `master_account_user`; for `account_user` the role is set per entry inside `accounts`
 * instead. This app passes both through as given rather than validating that pairing —
 * WhatConverts's own 4xx already reports a mismatched combination.
 */
const userCreate: ActionDefinition<Input, Output> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Invite a new user. Requires a Master Account (agency) Key.",
  idempotent: false,
  params: [
    {
      key: "userType",
      label: "User type",
      type: "select",
      required: true,
      options: [
        { value: "master_account_user", label: "Master account user" },
        { value: "account_user", label: "Account user" },
      ],
    },
    { key: "email", label: "Email address", type: "string", required: true },
    {
      key: "roleId",
      label: "Role ID",
      type: "number",
      hint: "master_account_user only — the role_id from roles-list/role-get.",
    },
    {
      key: "newAccountNotifications",
      label: "New-account notification defaults",
      type: "json",
      advanced: true,
      hint: 'master_account_user only. e.g. {"reports": true, "phone_calls": false, ' +
        '"web_forms": false, "transactions": false, "events": false, "chats": false, ' +
        '"emails": false, "other": false, "text_messages": false}.',
    },
    {
      key: "accounts",
      label: "Account access",
      type: "json",
      advanced: true,
      hint: "Array of account access grants, e.g. " +
        '[{"account_id": 123, "role_id": 456, "reports": true}]. For account_user, ' +
        "role_id here is required per entry.",
    },
  ],
  output: [
    { key: "user_id", type: "number", label: "The created user's ID" },
    { key: "user_type", type: "string", label: "master_account_user or account_user" },
    { key: "email", type: "string", label: "Email address" },
    { key: "pending_activation", type: "boolean", label: "Always true for a new user" },
    { key: "date_created", type: "string", label: "Date created (ISO 8601, UTC)" },
    { key: "role_id", type: "number", label: "Role ID (master_account_user)" },
    { key: "role_name", type: "string", label: "Role name (master_account_user)" },
  ],

  async execute(input, ctx) {
    const body = compact({
      user_type: input.userType,
      email: input.email,
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

export default userCreate;
