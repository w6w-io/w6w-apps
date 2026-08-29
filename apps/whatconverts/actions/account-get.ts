import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";
import { ACCOUNT_OUTPUT_FIELDS } from "../lib/account-fields.ts";

interface Input {
  accountId: number;
}

/**
 * `GET /accounts/{account_id}` — details for a single account. Requires a Master Account
 * (agency) Key. Verified against `whatconverts.com/api/accounts/` on 2026-08-29.
 */
const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Get details for a single account. Requires a Master Account (agency) Key.",
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
  ],
  output: ACCOUNT_OUTPUT_FIELDS,

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(`/accounts/${input.accountId}`);
  },
};

export default accountGet;
