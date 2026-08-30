import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";

interface Input {
  accountId: number;
}

interface Output {
  account_id: number;
}

/**
 * `DELETE /accounts/{account_id}` — permanently delete an account and everything under it.
 * Requires a Master Account (agency) Key.
 *
 * Verified against `whatconverts.com/api/accounts/` on 2026-08-29, which carries its own
 * notice: "This will remove all profiles, numbers, leads and other settings associated with
 * this account." Not idempotent — a repeat call against an already-deleted account has no
 * further row to remove and is not documented to answer the same way as the first call.
 */
const accountDelete: ActionDefinition<Input, Output> = {
  key: "account-delete",
  type: "perform",
  resource: "account",
  title: "Delete Account",
  description: "Permanently delete an account, its profiles, numbers, leads and settings. " +
    "Requires a Master Account (agency) Key. This cannot be undone.",
  idempotent: false,
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
  ],
  output: [
    { key: "account_id", type: "number", label: "The deleted account's ID" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).delete(`/accounts/${input.accountId}`);
  },
};

export default accountDelete;
