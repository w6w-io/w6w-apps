import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `GET /v1/me` — the connected account's status, credit balance, and call count.
 *
 * Verified against `docs.bland.ai/api-v1/get/me`. This is also the auth
 * `test` probe and the `quota` health check's read — see `auth/api-key.ts`
 * and `health/quota.ts` for why: it needs a credential, and it returns only
 * account metadata and a credit balance, never a usable secret.
 */
const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch the connected account's status, billing balance, and total call count.",
  params: [],
  output: [
    { key: "status", type: "string", label: "Account status" },
    { key: "currentBalance", type: "number", label: "Current credit balance" },
    { key: "refillTo", type: "number", label: "Auto-refill target, if enabled" },
    { key: "totalCalls", type: "number", label: "Total calls made" },
  ],

  async execute(_input, ctx) {
    const res = await new BlandClient(ctx).request<{
      status?: string;
      billing?: { current_balance?: number; refill_to?: number | null };
      total_calls?: number;
    }>("/v1/me");

    return {
      status: res.status,
      currentBalance: res.billing?.current_balance,
      refillTo: res.billing?.refill_to ?? undefined,
      totalCalls: res.total_calls,
    };
  },
};

export default accountGet;
