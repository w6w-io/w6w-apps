/**
 * How much rate-limit headroom does this credential have left?
 *
 * The OpenAPI document's own description states response headers
 * `X-RateLimit-Remaining-Requests` and `X-RateLimit-Remaining-Tokens` are
 * "included in responses" — but only a REMAINING count, never a ceiling
 * (`X-RateLimit-Limit-*` is not documented anywhere), so a percentage-based
 * verdict is impossible; this reports the raw remaining counts.
 *
 * ## Declared, not measured live
 *
 * Every request made while building this app — public `/v1/models`, every
 * 401 (missing/invalid key), the 404, the 500 — carried NEITHER header.
 * That's consistent with them only being attached to a request that got far
 * enough to reach the rate limiter with a VALID key, which this app never had
 * one of. So this check reads them opportunistically off the same
 * `GET /v1/batches?limit=1` call the credential probe already makes (see
 * `auth/bearer-token.ts`) and reports `unknown` — not `ok` and not `degraded`
 * — when they're absent, rather than asserting a shape nobody has confirmed.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/bearer-token.ts";

/** Below this many remaining requests or tokens, headroom is worth flagging. */
export const LOW_REQUESTS_THRESHOLD = 5;
export const LOW_TOKENS_THRESHOLD = 1000;

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description: "Remaining requests/tokens this minute, read from X-RateLimit-Remaining-* " +
    "response headers when Jina AI sends them.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json" },
    });

    const remainingRequests = res.headers.get("x-ratelimit-remaining-requests");
    const remainingTokens = res.headers.get("x-ratelimit-remaining-tokens");
    if (remainingRequests === null && remainingTokens === null) {
      return {
        state: "unknown",
        message: "Jina AI did not send X-RateLimit-Remaining-* headers on this response",
      };
    }

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let degraded = false;

    if (remainingRequests !== null) {
      const value = Number(remainingRequests);
      quotas.push({ id: "requests", remaining: value, unit: "requests" });
      if (Number.isFinite(value) && value <= LOW_REQUESTS_THRESHOLD) {
        degraded = true;
        notes.push(`only ${value} request(s) left this window`);
      }
    }
    if (remainingTokens !== null) {
      const value = Number(remainingTokens);
      quotas.push({ id: "tokens", remaining: value, unit: "tokens" });
      if (Number.isFinite(value) && value <= LOW_TOKENS_THRESHOLD) {
        degraded = true;
        notes.push(`only ${value} token(s) left this window`);
      }
    }

    return {
      state: degraded ? "degraded" : "ok",
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
