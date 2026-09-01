import type { ActionDefinition } from "@w6w/types";
import { API_BASE, request } from "../lib/client.ts";

interface AccountsResponse {
  accounts?: Array<Record<string, unknown>>;
}

/**
 * `GET /v2/accounts` — the one Drip endpoint (besides `/v2/user`) that sits
 * directly under the API root rather than `/v2/:account_id/...`, so it does
 * not go through `DripClient`.
 */
const listAccounts: ActionDefinition<Record<string, never>> = {
  key: "list-accounts",
  type: "read",
  resource: "account",
  title: "List Accounts",
  description: "List every Drip account the authenticated API token can access.",
  params: [],
  output: [{ key: "accounts", type: "array", label: "Accounts" }],

  async execute(_input, ctx) {
    const body = await request<AccountsResponse>(ctx, API_BASE, "/accounts");
    return { accounts: body.accounts ?? [] };
  },
};

export default listAccounts;
