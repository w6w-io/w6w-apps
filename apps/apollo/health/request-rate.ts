/**
 * Request-rate headroom, read off Apollo's own rate-limit headers.
 *
 * Confirmed on `docs.apollo.io/reference/rate-limits` (fetched 2026-08-29): Apollo
 * enforces per-minute/hour/day windows **per team, per endpoint** — not per API key —
 * and on every successfully-authenticated response adds:
 *
 *   `x-rate-limit-minute` / `x-rate-limit-hourly` / `x-rate-limit-24-hour` — the ceiling
 *   `x-minute-usage` / `x-hourly-usage` / `x-24-hour-usage` — consumed so far, this call included
 *   `x-minute-requests-left` / `x-hourly-requests-left` / `x-24-hour-requests-left` — remaining
 *
 * "If Apollo doesn't limit a window for the endpoint you called, its header is empty and
 * no usage headers are returned for that window" — the vendor's own words — so a missing
 * window is treated as "not metered here", not as a parse failure.
 *
 * ## Necessarily scoped to ONE endpoint, and that is stated rather than hidden
 *
 * These limits are per-endpoint, and this check has to pick one to read; it reuses the
 * same `GET /users/api_profile` call the credential probe and `auth/api-key.ts`'s
 * `afterConnect` already make (0 credits, no extra request), so headroom on THAT specific
 * endpoint is what gets reported — not a blanket API-wide number, because Apollo does not
 * publish one. A workflow hammering `mixed_people/api_search` or `contacts/bulk_create`
 * is bound by a completely different, unreported ceiling; `view-api-usage-stats` (the
 * `usage-stats-get` action) is where to check a specific endpoint's own limits on demand.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

export const RATE_URL = `${API_BASE}${PROBE_PATH}`;

const WINDOWS = [
  {
    id: "minute",
    limit: "x-rate-limit-minute",
    usage: "x-minute-usage",
    left: "x-minute-requests-left",
  },
  {
    id: "hour",
    limit: "x-rate-limit-hourly",
    usage: "x-hourly-usage",
    left: "x-hourly-requests-left",
  },
  {
    id: "day",
    limit: "x-rate-limit-24-hour",
    usage: "x-24-hour-usage",
    left: "x-24-hour-requests-left",
  },
] as const;

function num(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Read the three windows off a response's headers. Exported so it is testable with a fake `Headers`. */
export function readWindows(headers: Headers): HealthQuota[] {
  const quotas: HealthQuota[] = [];
  for (const w of WINDOWS) {
    const limit = num(headers, w.limit);
    if (limit === undefined) continue; // "not metered for this window" per the vendor's own note
    const remaining = num(headers, w.left);
    quotas.push({
      id: `users-api-profile-per-${w.id}`,
      limit,
      remaining: remaining ?? Math.max(0, limit - (num(headers, w.usage) ?? 0)),
      unit: "requests",
    });
  }
  return quotas;
}

const WARN_FRACTION = 0.9;

const requestRate: HealthCheckDefinition = {
  key: "request-rate",
  title: "Request-rate headroom (whoami endpoint)",
  description: "Per-minute/hour/day headroom for GET /users/api_profile, read from Apollo's own " +
    "x-rate-limit-*/x-*-requests-left response headers. Scoped to that one endpoint — see the " +
    "module doc for why a blanket figure isn't available.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(RATE_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Apollo returned ${res.status} for ${PROBE_PATH}` };
    }

    const quotas = readWindows(res.headers);
    if (quotas.length === 0) {
      return { state: "unknown", message: "No rate-limit headers on the response" };
    }

    let state: HealthState = "ok";
    const notes: string[] = [];
    for (const q of quotas) {
      if (q.limit === undefined || q.remaining === undefined || q.limit <= 0) continue;
      const fraction = 1 - q.remaining / q.limit;
      if (fraction >= 1) {
        state = "degraded"; // a request budget recovers on its own; never `down`
        notes.push(`${q.id} exhausted (${q.remaining}/${q.limit} left)`);
      } else if (fraction >= WARN_FRACTION && state !== "degraded") {
        state = "degraded";
        notes.push(`${q.id} at ${Math.round(fraction * 100)}% (${q.remaining}/${q.limit} left)`);
      }
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default requestRate;
