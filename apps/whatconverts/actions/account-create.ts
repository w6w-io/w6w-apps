import type { ActionDefinition } from "@w6w/types";
import { boolParam, compact, WhatConvertsClient } from "../lib/client.ts";
import { ACCOUNT_OUTPUT_FIELDS } from "../lib/account-fields.ts";

interface Input {
  accountName: string;
  createProfile?: boolean;
}

/**
 * `POST /accounts` — create a new account (agency sub-client). Requires a Master Account
 * (agency) Key. Verified against `whatconverts.com/api/accounts/` on 2026-08-29.
 */
const accountCreate: ActionDefinition<Input> = {
  key: "account-create",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description: "Create a new account. Requires a Master Account (agency) Key.",
  idempotent: false,
  params: [
    { key: "accountName", label: "Account name", type: "string", required: true },
    {
      key: "createProfile",
      label: "Create a default profile",
      type: "boolean",
      default: false,
    },
  ],
  output: ACCOUNT_OUTPUT_FIELDS,

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).post(
      "/accounts",
      compact({
        account_name: input.accountName,
        create_profile: boolParam(input.createProfile ?? false),
      }),
    );
  },
};

export default accountCreate;
