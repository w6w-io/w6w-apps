/**
 * How much rate-limit headroom is left on THIS credential.
 *
 * Per the "Rate limiting" guide (`workable.readme.io/reference/rate-limits`,
 * read 2026-09-05): account tokens get 10 requests / 10 seconds, reported on
 * every response via `X-Rate-Limit-Limit` / `X-Rate-Limit-Remaining` /
 * `X-Rate-Limit-Reset`. This could not be verified live — no real access
 * token was available while building this app, and an unauthenticated
 * request carries none of these headers (confirmed live). `resetAt` is
 * therefore built from the documented header name alone and treated as a
 * Unix epoch timestamp, since the doc's own wording ("Timestamp of next
 * interval") reads as absolute rather than a delta.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from the derived `auth:*`
 *     check's "is this credential live".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults: the allowance belongs to the credential, and reading it
 *     needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own `*.workable.com` allowlist — no `network.allow`
 *     of its own is declared, which the spec requires alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: the same `GET /accounts/:subdomain` the auth `test` hook uses — the
 * cheapest signed read this app has, so the quota check spends no extra
 * request beyond what a health run needed anyway.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl, readRateLimit, subdomainFromConnection } from "../lib/client.ts";

const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Per-10-second account-token allowance remaining, read off the documented X-Rate-Limit-* " +
    "headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let subdomain: string;
    try {
      subdomain = subdomainFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String(err) };
    }

    const res = await ctx.fetch(`${baseUrl(subdomain)}/accounts/${subdomain}`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const { limit, remaining, resetAt } = readRateLimit(res.headers);
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-Rate-Limit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "account",
        limit,
        remaining,
        resetAt: resetAt !== undefined ? new Date(resetAt * 1000).toISOString() : undefined,
        unit: "requests",
      }],
      ttlSeconds: 30,
    };
  },
};

export default quota;
