import type { ActionDefinition } from "@w6w/types";
import { DeepSeekClient } from "../lib/client.ts";

/**
 * GET /user/balance — the account's current balance, broken down by currency
 * and by grant vs. top-up. Does NOT echo the credential back (verified
 * against https://api-docs.deepseek.com/api/get-user-balance/, 2026-09-05:
 * the response carries only `is_available` and a `balance_infos` array), so
 * it is safe to expose as a plain read action, distinct from the `quota`
 * health check that reads the same endpoint for the informational headroom
 * signal.
 *
 * Exposed as its own action (rather than folded into the health check only)
 * because a workflow may want to gate a batch of calls on remaining balance
 * before running them, rather than discovering a 402 mid-run.
 */
const getBalance: ActionDefinition<Record<string, never>> = {
  key: "get-balance",
  type: "read",
  resource: "account",
  title: "Get Account Balance",
  description: "Read the account's current balance (granted + topped-up), by currency.",
  params: [],
  output: [
    { key: "is_available", type: "boolean", label: "Balance sufficient for API calls" },
    { key: "balance_infos", type: "array", label: "Balances by currency" },
  ],

  execute(_input, ctx) {
    const client = new DeepSeekClient(ctx);
    return client.request("/user/balance");
  },
};

export default getBalance;
