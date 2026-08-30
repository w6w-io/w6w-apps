import type { OutputField } from "@w6w/types";

/** `whatconverts.com/api/accounts/` — shared by get/create/edit single-account responses. */
export const ACCOUNT_OUTPUT_FIELDS: OutputField[] = [
  { key: "account_id", type: "number", label: "Account ID" },
  { key: "account_name", type: "string", label: "Account name" },
  { key: "date_created", type: "string", label: "Date created (ISO 8601, UTC)" },
  { key: "profiles", type: "array", label: "Profiles under this account" },
];
