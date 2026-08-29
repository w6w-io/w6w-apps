/**
 * How much credit headroom is left on THIS key.
 *
 * OpenRouter does not attach `X-RateLimit-*` (or any other quota) headers to
 * a successful inference response — confirmed against
 * `openrouter.ai/docs/api_reference/limits`: "Successful inference responses
 * do not include `X-RateLimit-*` headers... To monitor your remaining quota
 * before hitting a limit, call `GET /api/v1/key`." That is the vendor's own
 * documented mechanism, not a workaround, which is why this check reads a
 * JSON body rather than headers (unlike this pack's other LLM apps).
 *
 * `GET /key` returns `limit` (the key's own credit cap, or `null` if
 * unlimited) and `limit_remaining` (credits left against that cap, or `null`
 * to match). A `null` limit is "no cap configured", not "no headroom" — an
 * unlimited key is reported `ok`, not `unknown`.
 *
 * This is the same endpoint the `api-key` Auth method's `test` hook probes.
 * That is deliberate, not duplication: it is the one call in the covered
 * surface that needs a credential, costs nothing, and returns no credential
 * material — simultaneously the right liveness probe and the only source of
 * headroom. `minIntervalSeconds` keeps the cost to one call every 5 minutes.
 *
 * `severity: "informational"` because running low is worth showing and never
 * worth failing a verdict over.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

interface KeyInfoBody {
  data?: {
    limit?: number | null;
    limit_remaining?: number | null;
  };
}

/** Fraction of the cap remaining at or below this is worth flagging. */
export const WARN_FRACTION = 0.1;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Credit headroom",
  description: "This key's own credit limit and remaining headroom, read from GET /key.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/key`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const body = await res.json().catch(() => null) as KeyInfoBody | null;
    const data = body?.data;
    if (!data) return { state: "unknown", message: "key info response carried no data" };

    const { limit, limit_remaining: remaining } = data;

    // `limit: null` means "no per-key cap configured" — unmetered, not exhausted.
    if (limit === null || limit === undefined) {
      return { state: "ok", quota: [{ id: "credits", unit: "USD" }], ttlSeconds: 60 };
    }
    if (typeof remaining !== "number") {
      return { state: "unknown", message: "key has a limit but no limit_remaining value" };
    }

    const quotaReading: HealthQuota = { id: "credits", limit, remaining, unit: "USD" };
    let state: HealthState = "ok";
    let message: string | undefined;
    if (remaining <= 0) {
      state = "down";
      message = `key credit limit exhausted (${remaining}/${limit} USD remaining)`;
    } else if (limit > 0 && remaining / limit < WARN_FRACTION) {
      state = "degraded";
      message = `key credit headroom low (${remaining}/${limit} USD remaining)`;
    }

    return { state, message, quota: [quotaReading], ttlSeconds: 60 };
  },
};

export default quota;
