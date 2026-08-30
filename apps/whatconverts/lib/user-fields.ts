import type { OutputField } from "@w6w/types";

/** `whatconverts.com/api/users/` — fields common to the list and single-user responses. */
export const USER_LIST_OUTPUT_FIELDS: OutputField[] = [
  { key: "user_id", type: "number", label: "User ID" },
  { key: "user_type", type: "string", label: "master_account_user or account_user" },
  { key: "email", type: "string", label: "Email address" },
  { key: "pending_activation", type: "boolean", label: "Whether the user has not yet activated" },
  { key: "date_created", type: "string", label: "Date created (ISO 8601, UTC)" },
  {
    key: "role_name",
    type: "string",
    label: "Master account role name (master_account_user only)",
  },
  { key: "role_id", type: "number", label: "Master account role ID (master_account_user only)" },
];

/** Single-user GET adds the per-account and new-account notification detail. */
export const USER_OUTPUT_FIELDS: OutputField[] = [
  ...USER_LIST_OUTPUT_FIELDS,
  {
    key: "new_account_notifications",
    type: "object",
    label: "Default notifications for new accounts (master_account_user only)",
  },
  {
    key: "accounts",
    type: "array",
    label: "Accounts this user can access, with per-account role and notifications " +
      "(account_user only)",
  },
];
