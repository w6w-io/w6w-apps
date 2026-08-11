/**
 * How much rate-limit headroom is left on THIS credential.
 *
 * ## What EmailOctopus documents
 *
 * From the v2 API's own introduction (fetched 2026-08-11): the limit is a
 * **token bucket** — "your bucket holds up to 100 tokens. Tokens are
 * replenished at a rate of 10 per second" — and "to check your remaining
 * tokens, refer to the `X-RateLimiting-Remaining` header in the response". A
 * 429 additionally carries `X-RateLimit-Retry-After`.
 *
 * ## Two traps in those two header names
 *
 * 1. **It is `X-RateLimiting-Remaining`, not `X-RateLimit-Remaining`.** The
 *    near-universal spelling is the second one; EmailOctopus uses the first.
 *    Reading the habitual name gets `null` forever, and a check written that
 *    way reports "no quota data" on a perfectly healthy account.
 * 2. **The two headers do not even agree with each other.** The remaining
 *    counter is `X-RateLimit**ing**-*` while the retry hint is
 *    `X-RateLimit-Retry-After` — different prefixes, same vendor, same
 *    paragraph of the same document. This check reads the documented spelling
 *    first and the conventional one as a fallback, because getting it wrong in
 *    either direction costs the reading.
 *
 * Neither header is declared anywhere in the machine-readable part of the v2
 * OpenAPI document — they appear only in the prose introduction, so there is no
 * schema promising them on a 2xx. They were also **not present** on the live
 * 401 responses measured on 2026-08-11 (that response carries only Cloudflare's
 * own headers), which is consistent with them being emitted for authenticated
 * requests. This app therefore reads the header when it is there and reports
 * `unknown` when it is not, rather than inventing a remaining count from the
 * documented bucket size of 100.
 *
 * ## Bucket size is a constant, not a reading
 *
 * `limit: 100` below is the documented bucket capacity, reported alongside the
 * live `remaining` so a UI can render a ratio. It is not measured per request
 * and does not vary by plan in anything EmailOctopus publishes. The refill rate
 * (10/s) is why `resetAt` is computed rather than read: a full bucket is at most
 * ten seconds away, and the vendor sends no reset timestamp.
 *
 * ## Annotation
 *
 *   - `kind: "quota"`, `scope: "connection"`, `credential: "signed"` — the
 *     allowance belongs to the credential and reading it needs the credential
 *     on the wire. Signing is safe here because the probe stays on the app's own
 *     egress host; this check declares no `network.allow`, which the spec
 *     forbids alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *   - Probe: `GET /lists?limit=1`, the same cheap, scope-free call the auth
 *     `test` hook uses, asking for a single row.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/** Documented bucket capacity: 100 tokens, refilled at 10 per second. */
export const BUCKET_SIZE = 100;
const REFILL_PER_SECOND = 10;

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Seconds until the bucket is full again, from the documented refill rate.
 * Reported as an instant because `HealthQuota.resetAt` is ISO 8601.
 */
export function refillAt(remaining: number, now = Date.now()): string {
  const missing = Math.max(0, BUCKET_SIZE - remaining);
  return new Date(now + Math.ceil(missing / REFILL_PER_SECOND) * 1000).toISOString();
}

/** Headroom is context, not a verdict — `informational` means it never worsens a roll-up. */
export function headroom(remaining: number): HealthState {
  if (remaining <= 0) return "down";
  if (remaining < BUCKET_SIZE * 0.1) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Tokens left in this credential's rate-limit bucket, read from the `X-RateLimiting-Remaining` header (note the spelling — it is not `X-RateLimit-Remaining`). The bucket holds 100 and refills at 10 per second.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/lists?limit=1`, {
      headers: { accept: "application/json" },
    });
    const h = res.headers;
    // Documented spelling first, conventional spelling as a fallback.
    const remaining = num(h.get("x-ratelimiting-remaining")) ??
      num(h.get("x-ratelimit-remaining"));

    if (res.status === 429) {
      const retryAfter = num(h.get("x-ratelimit-retry-after")) ?? num(h.get("retry-after"));
      return {
        state: "down",
        message: "rate limited — the token bucket is empty",
        quota: [{
          id: "requests",
          limit: BUCKET_SIZE,
          remaining: remaining ?? 0,
          resetAt: retryAfter === undefined
            ? refillAt(0)
            : new Date(Date.now() + retryAfter * 1000).toISOString(),
          unit: "requests",
        }],
        ttlSeconds: 60,
      };
    }

    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    if (remaining === undefined) {
      return {
        state: "unknown",
        message:
          "response carried no X-RateLimiting-Remaining header; EmailOctopus documents it in prose but its OpenAPI document does not declare it",
        ttlSeconds: 60,
      };
    }

    return {
      state: headroom(remaining),
      quota: [{
        id: "requests",
        limit: BUCKET_SIZE,
        remaining,
        resetAt: refillAt(remaining),
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
