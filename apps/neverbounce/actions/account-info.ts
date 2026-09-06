import type { ActionDefinition } from "@w6w/types";
import { NeverBounceClient } from "../lib/client.ts";

/**
 * `GET /account/info` — credit balance and job counts for the account.
 * Source: the OAS `operationId: account-info` embedded in
 * `https://developers.neverbounce.com/reference/account-info`. The same
 * endpoint doubles as this app's Auth liveness probe and quota health check —
 * see `auth/api-key.ts` and `health/quota.ts`.
 */
const accountInfo: ActionDefinition<Record<string, never>> = {
  key: "account-info",
  type: "read",
  resource: "account",
  title: "Get Account Info",
  description: "Check the account's remaining credits and job counts.",
  params: [],
  output: [
    { key: "credits_info", type: "object", label: "Paid/free credits used and remaining" },
    { key: "job_counts", type: "object", label: "Bulk job counts by status" },
    { key: "execution_time", type: "number", label: "Server-side execution time, in ms" },
  ],

  execute(_input, ctx) {
    const client = new NeverBounceClient(ctx);
    return client.request("/account/info");
  },
};

export default accountInfo;
