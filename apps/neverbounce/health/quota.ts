/**
 * How many verification credits does this account have left?
 *
 * `GET /account/info` — the same free, non-echoing call `auth/api-key.ts`
 * uses for credential liveness — returns `credits_info: {paid_credits_used,
 * free_credits_used, paid_credits_remaining, free_credits_remaining}`. There
 * is no separate plan-allocation/`limit` field documented anywhere (credits
 * are purchased in packs, not granted as a recurring quota), so this check
 * reports `remaining` only, with no `limit` and therefore no percentage-based
 * early warning the way a capped-quota vendor would support.
 *
 * `severity: "informational"`: running low is worth surfacing, never worth
 * failing a verdict on its own — a job or single-check call that actually
 * runs out of credits already tells a caller precisely when it has to stop
 * (per `docs/error-handling`'s `general_failure` status).
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { BASE_PATH, HOST } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Verification credit balance",
  description: "Remaining paid + free verification credits, read from GET /account/info.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const url = new URL(`https://${HOST}${BASE_PATH}/account/info`);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    const text = await res.text();

    let body: {
      status?: string;
      message?: string;
      credits_info?: { paid_credits_remaining?: number; free_credits_remaining?: number };
    } | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      // Not JSON — fall through to `unknown` below.
    }

    if (!body || typeof body.status !== "string") {
      return {
        state: "unknown",
        message: `NeverBounce returned ${res.status}: ${text || res.statusText}`,
      };
    }
    if (body.status !== "success") {
      // Covers `auth_failure` too — already reported by the derived
      // `auth:api-key` check, so this reports `unknown` rather than `down` to
      // avoid double-counting the same failure as two different problems.
      return {
        state: "unknown",
        message: body.message
          ? `NeverBounce returned status "${body.status}": ${body.message}`
          : `NeverBounce returned status "${body.status}"`,
      };
    }

    const paid = body.credits_info?.paid_credits_remaining ?? 0;
    const free = body.credits_info?.free_credits_remaining ?? 0;
    const remaining = paid + free;

    return {
      state: remaining <= 0 ? "down" : "ok",
      message: remaining <= 0 ? "0 credits remaining" : undefined,
      quota: [{ id: "credits", remaining, unit: "credits" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
