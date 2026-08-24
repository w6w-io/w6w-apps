/**
 * How many PDF.co credits does this account have left?
 *
 * `GET /v1/account/credit/balance` is the same endpoint `auth/api-key.ts`
 * uses as its liveness probe — deliberately, not duplicated: it is the one
 * endpoint in this surface that needs no scope, returns no credential
 * material, and is cheap enough to poll on a schedule. The two checks answer
 * different questions from the same read.
 *
 * ## No ceiling is published, only what's left
 *
 * Unlike Apify's `/v2/users/me/limits` (limit AND current usage in one call),
 * PDF.co's balance endpoint documents exactly one field:
 * `{"remainingCredits": 99795868}` — no plan ceiling, no reset date. That
 * means a fraction-of-plan reading (the usual "90% consumed" warning) is not
 * computable from this API at all, for any account, on any plan. This check
 * reports `remaining` with no `limit`, which `HealthQuota` supports
 * (`limit` is optional), rather than inventing a denominator PDF.co never
 * states.
 *
 * A `remainingCredits` of exactly zero is still meaningful without a
 * ceiling: every metered call this app makes will fail with `402 Not enough
 * credits` at that point, so zero is reported as `down`, not `unknown`.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const BALANCE_PATH = "/v1/account/credit/balance";

interface BalanceBody {
  remainingCredits?: number;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit balance",
  description: "Remaining PDF.co credits, read from GET /v1/account/credit/balance. PDF.co " +
    "publishes no plan ceiling via this API, so only a remaining count is reported.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${BALANCE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { state: "unknown", message: `PDF.co returned ${res.status} for ${BALANCE_PATH}` };
    }

    const body = await res.json().catch(() => null) as BalanceBody | null;
    const remaining = body?.remainingCredits;
    if (typeof remaining !== "number") {
      return { state: "unknown", message: "Balance response carried no remainingCredits field" };
    }

    return {
      state: remaining <= 0 ? "down" : "ok",
      message: remaining <= 0 ? "No PDF.co credits remaining — metered calls will fail" : undefined,
      quota: [{ id: "credits", remaining, unit: "credits" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
