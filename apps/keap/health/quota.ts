import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_ORIGIN, readQuotaHeaders, V2 } from "../lib/client.ts";

/**
 * How much of this connection's Keap throttle and quota is left?
 *
 * ## Keap meters three things at once, and they are not the same thing
 *
 * Documented at `developer.infusionsoft.com/api-token-quota-and-usage-measurements`
 * and read live off every response as headers:
 *
 *  1. **`x-keap-product-quota-*`** — the *daily* bucket for this credential.
 *     150,000/day for an OAuth client/secret pair; 30,000/day for a Personal
 *     Access Token or Service Account Key. Resets at 00:00 UTC.
 *  2. **`x-keap-product-throttle-*`** — the *per-minute* bucket for this
 *     credential. 1,500/minute for OAuth; 240/minute for a PAT/SAK.
 *  3. **`x-keap-tenant-throttle-*`** — the per-*application-instance* ceiling
 *     Keap introduced on 2026-06-08, enforced "regardless of token type":
 *     10,000/minute and 250,000/day. This one is shared with every other
 *     integration touching the same Keap app, so it can run out for reasons
 *     that have nothing to do with this connection.
 *
 * All three are reported. Collapsing them would hide the case that matters
 * most: plenty of personal quota left, tenant ceiling exhausted by somebody
 * else's integration.
 *
 * ## The tenant headers are pipe-delimited, and the documentation says they are not
 *
 * Keap's header table describes each field as a scalar —
 * "`x-keap-tenant-throttle-time-unit` … Currently 'minute' for all consumers".
 * Measured on 2026-08-11 the wire carries two windows in one header:
 *
 *     x-keap-tenant-throttle-time-unit: minute|day
 *     x-keap-tenant-throttle-interval: 1|1
 *
 * positionally aligned, matching the documented 10,000/minute + 250,000/day
 * pair. `Number("1|1")` is `NaN`, so a reader that trusts the documented scalar
 * reports nothing. `readQuotaHeaders` in `lib/client.ts` splits on `|` and
 * emits one reading per window.
 *
 * **What was and was not measured.** The header *names*, their presence on
 * every response, and the pipe-delimited structure were all measured directly
 * (an unauthenticated 401 carries the full header set, with `time-unit` and
 * `interval` populated). The *numeric* values were not: they are blank without
 * a live credential, which is exactly why this check is `credential: "signed"`.
 * The parsing is therefore written to survive both shapes and to report nothing
 * rather than something wrong when a family is absent or empty.
 *
 * ## The probe is the identity endpoint, on purpose
 *
 * `GET /rest/v2/oauth/connect/userinfo` is the same endpoint the credential
 * probe uses. That is deliberate rather than duplication: the quota reading is
 * carried by *every* response, so the cheapest correct probe is the cheapest
 * request that no permission can refuse — and on Keap that is the same one, for
 * the same reason (see `auth/probe.ts`). `minIntervalSeconds` keeps the cost to
 * one call a minute, and the call itself is counted against the very buckets it
 * reports.
 */
export const QUOTA_PROBE_URL = `${API_ORIGIN}${V2}/oauth/connect/userinfo`;

/** Consumption at or above this fraction of a ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

/** Worst-first, matching `HEALTH_STATE_RANK` in `@w6w/types`. */
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

export interface QuotaVerdict {
  quota: HealthQuota;
  state: HealthState;
  note?: string;
}

/**
 * Turn one header reading into a quota entry plus the state it implies.
 *
 * Exported so the arithmetic is testable without a fetch — it is the part that
 * decides whether an integration gets told it is about to stop working.
 *
 * A non-positive or missing limit is "not metered on this dimension", not "no
 * headroom": reading it the other way would report every unmetered family as
 * exhausted.
 */
export function judgeReading(reading: {
  id: string;
  limit?: number;
  available?: number;
  used?: number;
  window?: string;
}): QuotaVerdict {
  const quota: HealthQuota = {
    id: reading.window ? `${reading.id} (per ${reading.window})` : reading.id,
    unit: "requests",
  };
  if (typeof reading.limit === "number") quota.limit = reading.limit;
  if (typeof reading.available === "number") {
    // Never negative: a bucket can be overdrawn slightly before it refuses.
    quota.remaining = Math.max(0, reading.available);
  }

  if (typeof reading.limit !== "number" || reading.limit <= 0) {
    return { quota, state: "ok" };
  }

  // `available` is the vendor's own remaining count. `used` is only a fallback,
  // because the two are not guaranteed to sum to the limit across a rolling
  // window boundary and `available` is the one the vendor tells you to watch.
  const remaining = typeof reading.available === "number"
    ? reading.available
    : typeof reading.used === "number"
    ? reading.limit - reading.used
    : undefined;
  if (remaining === undefined) return { quota, state: "unknown" };

  const consumed = (reading.limit - remaining) / reading.limit;
  if (remaining <= 0) {
    return {
      quota,
      state: "down",
      note: `${quota.id} exhausted (0 of ${reading.limit} remaining)`,
    };
  }
  if (consumed >= WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      note: `${quota.id} at ${Math.round(consumed * 100)}% (${remaining} of ${reading.limit} left)`,
    };
  }
  return { quota, state: "ok" };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Throttle and quota headroom",
  description:
    "Per-credential daily quota and per-minute throttle, plus the per-tenant ceiling shared with " +
    "every other integration on the same Keap app, read from the x-keap-* headers on a single " +
    "identity request.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(QUOTA_PROBE_URL, { headers: { accept: "application/json" } });

    // A 429 is itself the answer: the buckets are empty. Keap still stamps the
    // headers on the refusal, so the reading below is read from it either way.
    const readings = readQuotaHeaders(res.headers);

    if (!res.ok && res.status !== 429) {
      return { state: "unknown", message: `Keap returned ${res.status} for the identity read` };
    }
    if (readings.length === 0) {
      return {
        state: "unknown",
        message: "Keap returned no populated x-keap-* quota headers on this response",
      };
    }

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = res.status === 429 ? "degraded" : "ok";
    if (res.status === 429) notes.push("Keap is currently throttling this credential (429)");

    for (const reading of readings) {
      const verdict = judgeReading(reading);
      quotas.push(verdict.quota);
      if (verdict.note) notes.push(verdict.note);
      if (RANK[verdict.state] > RANK[state]) state = verdict.state;
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
