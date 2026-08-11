import type { ActionDefinition } from "@w6w/types";
import { ApifyClient } from "../lib/client.ts";

/**
 * `GET /v2/users/me/limits` — the plan's ceilings and what has been used
 * against them.
 *
 * Returns `{monthlyUsageCycle, limits, current}` — the same figures as the
 * account's Limits page in Apify Console. It is the endpoint to call before
 * launching a batch of runs, because the numbers that stop work
 * (`maxMonthlyUsageUsd`, `maxMonthlyActorComputeUnits`, `maxConcurrentActorJobs`)
 * are all here and nowhere else.
 *
 * ## Three uses, one endpoint
 *
 * This is also the connection's credential probe (`auth/api-token.ts`) and the
 * source for the `quota` health check. That is not duplication: it is the one
 * endpoint in the covered surface that requires a credential, is reachable by
 * the narrowest usable scoped token, and returns no credential material — which
 * makes it simultaneously the right liveness probe, the right headroom reading,
 * and a useful thing for a workflow to read directly.
 *
 * Note that `maxMonthlyUsageUsd` is a ceiling the account owner sets. Zero means
 * "no ceiling configured", not "no headroom".
 */
const accountLimitsGet: ActionDefinition<Record<string, never>> = {
  key: "account-limits-get",
  type: "read",
  resource: "account",
  title: "Get Account Limits",
  description: "Read the account's plan limits and current usage against them.",
  params: [],
  output: [
    { key: "monthlyUsageCycle", type: "object", label: "Start and end of the current cycle" },
    { key: "limits", type: "object", label: "Plan ceilings" },
    { key: "current", type: "object", label: "Usage so far against those ceilings" },
  ],

  execute(_input, ctx) {
    return new ApifyClient(ctx).data("/users/me/limits");
  },
};

export default accountLimitsGet;
