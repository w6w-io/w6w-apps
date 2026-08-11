import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * How much headroom does this connection have?
 *
 * Raindrop meters two independent things and this check reads both from **one**
 * request — the same `GET /rest/v1/user` the credential probe uses, for the
 * reasons in `auth/probe.ts` (it requires a credential, it is not scope
 * restricted, and its documented schema contains no credential material).
 *
 * ## 1. Request rate — from the response headers
 *
 * The reference documents 120 requests/minute per authenticated user and three
 * headers:
 *
 *     X-RateLimit-Limit      the ceiling per minute
 *     RateLimit-Remaining    requests left in the window   <- note: no `X-`
 *     X-RateLimit-Reset      window reset, UTC epoch seconds
 *
 * The middle one is spelled without the `X-` prefix in the vendor's own table
 * while its 429 example prints `X-RateLimit-Remaining`. Both spellings are read
 * here ({@link readRateLimit}) rather than picking one and being wrong half the
 * time.
 *
 * **Their presence could not be verified at build time and this check does not
 * pretend otherwise.** Every unauthenticated response measured on 2026-08-11
 * carried no rate-limit header of any spelling — which is expected, since the
 * limit is documented as per *authenticated* user — and no Raindrop credential
 * was available to measure an authenticated one. So the dimension is reported
 * when the headers are there and silently skipped when they are not; it never
 * fabricates a reading, and the message says which case occurred.
 *
 * ## 2. File-upload allowance — from the body
 *
 * `files.size` (the account's total upload allowance) and `files.used` (consumed
 * this month) are documented User fields and appear in the reference's own
 * sample response (`used: 6766094`, `size: 10000000000`). This is the quota that
 * actually stops work for an account that uploads: it is monthly, and
 * `files.lastCheckPoint` records when it last reset.
 *
 * This app declares no upload Action — the multipart endpoints are out of scope,
 * see the README — so nothing here *consumes* that allowance. It is reported
 * anyway because a health check answers "is this account in trouble", not "is
 * this app in trouble", and an account at its file ceiling is a Raindrop account
 * that is failing for its owner in the app's own UI.
 *
 * ## What a limit of zero means
 *
 * A missing or non-positive `files.size` is "no allowance published", not "no
 * headroom". Reading it the other way would report every free account as
 * exhausted, so a non-positive ceiling is skipped rather than scored.
 *
 * ## Reporting posture
 *
 * `kind: "quota"` defaults to `scope: "connection"` + `credential: "signed"`,
 * which is right: headroom is per credential. Both are stated explicitly. A
 * non-2xx answer reports `unknown` rather than `degraded` — failing to read a
 * quota is not evidence of a low quota, and the credential's own liveness is the
 * derived `auth:*` checks' job, not this one's.
 */

export const QUOTA_URL = `${API_BASE}${API_PREFIX}/user`;

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

interface UserBody {
  result?: boolean;
  user?: {
    files?: { used?: number; size?: number; lastCheckPoint?: string };
  };
}

export interface RateLimitReading {
  limit?: number;
  remaining?: number;
  /** ISO 8601, converted from the vendor's UTC epoch **seconds**. */
  resetAt?: string;
}

/**
 * Read the documented rate-limit headers, accepting both spellings of
 * "remaining".
 *
 * `X-RateLimit-Reset` is documented as "UTC epoch seconds", so it is multiplied
 * by 1000 before becoming a `Date`. Treating it as milliseconds would put every
 * reset in January 1970 and make `resetAt` quietly useless.
 */
export function readRateLimit(headers: Headers): RateLimitReading {
  const num = (name: string): number | undefined => {
    const raw = headers.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const limit = num("x-ratelimit-limit");
  const remaining = num("ratelimit-remaining") ?? num("x-ratelimit-remaining");
  const resetSeconds = num("x-ratelimit-reset") ?? num("ratelimit-reset");

  const reading: RateLimitReading = {};
  if (limit !== undefined) reading.limit = limit;
  if (remaining !== undefined) reading.remaining = remaining;
  if (resetSeconds !== undefined && resetSeconds > 0) {
    reading.resetAt = new Date(resetSeconds * 1000).toISOString();
  }
  return reading;
}

/** Worst-first, matching `HEALTH_STATE_RANK` in `@w6w/types`. */
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Account headroom",
  description:
    "Request-rate headroom from the X-RateLimit-* response headers (120 requests/minute per " +
    "user) and the monthly file-upload allowance from files.used / files.size, both read from " +
    "one GET /rest/v1/user.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(QUOTA_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Raindrop returned ${res.status} for /rest/v1/user` };
    }

    const body = await res.json().catch(() => null) as UserBody | null;
    // A 200 whose body says `result: false` is a failure the status code did not
    // report — a shape this API really does produce (see lib/client.ts).
    if (!body || body.result === false) {
      return { state: "unknown", message: "Raindrop returned an unreadable user object" };
    }

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";
    const worsen = (next: HealthState) => {
      if (RANK[next] > RANK[state]) state = next;
    };

    const rate = readRateLimit(res.headers);
    if (rate.limit !== undefined || rate.remaining !== undefined) {
      quotas.push({ id: "requests-per-minute", unit: "requests", ...rate });
      if (
        rate.limit !== undefined && rate.limit > 0 && rate.remaining !== undefined &&
        rate.remaining / rate.limit <= 1 - WARN_FRACTION
      ) {
        // Never worse than `degraded`, even at zero: the window is one minute
        // wide and recovers on its own, so an exhausted rate budget is a queue,
        // not an outage.
        worsen("degraded");
        notes.push(`${rate.remaining}/${rate.limit} requests left this minute`);
      }
    } else {
      // Stated rather than silent: a caller reading only `quota` deserves to
      // know the dimension is absent rather than assume it is fine.
      notes.push(
        "no rate-limit headers on the response (Raindrop documents X-RateLimit-Limit / " +
          "RateLimit-Remaining / X-RateLimit-Reset; this response carried none)",
      );
    }

    const files = body.user?.files;
    const size = files?.size;
    const used = files?.used;
    if (typeof size === "number" && size > 0 && typeof used === "number") {
      quotas.push({
        id: "file-storage",
        limit: size,
        // Never negative: a nonsense over-count must not render as a negative
        // "remaining".
        remaining: Math.max(0, size - used),
        unit: "bytes",
      });
      const fraction = used / size;
      if (fraction >= 1) {
        worsen("down");
        notes.push(`file uploads at ${used}/${size} bytes (100%)`);
      } else if (fraction >= WARN_FRACTION) {
        worsen("degraded");
        notes.push(`file uploads at ${used}/${size} bytes (${Math.round(fraction * 100)}%)`);
      }
    }

    if (quotas.length === 0) {
      return {
        state: "unknown",
        message: "Raindrop reported neither rate-limit headers nor a file allowance",
      };
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
