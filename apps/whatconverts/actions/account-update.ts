import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";
import { ACCOUNT_OUTPUT_FIELDS } from "../lib/account-fields.ts";

interface Input {
  accountId: number;
  accountName: string;
}

/**
 * `POST /accounts/{account_id}` — rename an account. Requires a Master Account (agency)
 * Key. Verified against `whatconverts.com/api/accounts/` on 2026-08-29 — `account_name` is
 * the only documented field.
 */
const accountUpdate: ActionDefinition<Input> = {
  key: "account-update",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description: "Edit an account's name. Requires a Master Account (agency) Key.",
  idempotent: true,
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
    { key: "accountName", label: "Account name", type: "string", required: true },
  ],
  output: ACCOUNT_OUTPUT_FIELDS,

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).post(`/accounts/${input.accountId}`, {
      account_name: input.accountName,
    });
  },
};

export default accountUpdate;
