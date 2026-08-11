/**
 * How much request quota does this connection have left?
 *
 * ## The header names are not in the documentation. They are in the client
 *
 * `developers.podio.com/doc` — a 19,167-byte index over fifty resource areas —
 * contains no rate-limit section, no `/limits` or `/usage` operation, and no
 * case-insensitive match for "rate limit" anywhere (checked 2026-08-11). Read
 * only the docs and the honest conclusion is that this check cannot exist.
 *
 * It can, because Podio's own PHP client publishes the whole surface in
 * source. `podio/podio-php`, `lib/PodioClient.php` v7.0.0:
 *
 *     public function rate_limit_remaining(): string {
 *         return implode($this->last_http_response->getHeader('x-rate-limit-remaining'));
 *     }
 *     public function rate_limit(): string {
 *         return implode($this->last_http_response->getHeader('x-rate-limit-limit'));
 *     }
 *
 * and, in its status switch:
 *
 *     case 420:
 *         throw new PodioRateLimitError(…);
 *
 * So: two headers, `X-Rate-Limit-Limit` and `X-Rate-Limit-Remaining` — note the
 * hyphen after `Rate`, which is *not* the `X-RateLimit-*` spelling almost every
 * other API uses and is exactly the sort of thing a copied header lookup gets
 * silently wrong — and **HTTP 420**, not 429, as the throttled status. A retry
 * policy keyed on 429 will never fire against Podio.
 *
 * ## What this check does not know, and says so
 *
 * The headers could not be observed on the wire, because they are absent from
 * unauthenticated responses and this build had no Podio credential to make an
 * authenticated one with. The names and the status code come from the vendor's
 * executable client rather than from a measurement.
 *
 * That is why every absence here reports `unknown` with a reason rather than
 * `ok`: if Podio does not send these headers on the probed endpoint, the check
 * says it could not read them instead of quietly reporting full headroom. A
 * quota check that reads "fine" because it found nothing is worse than one that
 * admits it found nothing.
 *
 * ## Probe
 *
 * `GET /oauth/scope`, the same endpoint both auth methods use for liveness. It
 * is the cheapest authenticated call in the covered surface, it works for a
 * user token and an app token alike, and it returns nothing secret. Reusing it
 * means this check adds no new endpoint and no new failure mode, and
 * `minIntervalSeconds` keeps the whole health surface to one call a minute.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const PROBE_URL = `${API_BASE}/oauth/scope`;

/**
 * The header names, spelled as Podio's own client spells them.
 *
 * `x-rate-limit-limit`, not `x-ratelimit-limit`. Both spellings are in
 * widespread use across other vendors, and reading the wrong one yields
 * `null` — which is indistinguishable from "no quota data" unless a check goes
 * out of its way to notice, which this one does.
 */
export const LIMIT_HEADER = "x-rate-limit-limit";
export const REMAINING_HEADER = "x-rate-limit-remaining";

/** Podio throttles with **420**, not 429. From `PodioClient.php`'s status switch. */
export const THROTTLED_STATUS = 420;

/** Remaining at or below this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.1;

/** A header value parsed as a non-negative integer, or undefined. */
export function parseCount(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
}

export interface QuotaReading {
  state: "ok" | "degraded" | "down" | "unknown";
  message?: string;
  quota?: HealthQuota[];
}

/**
 * Turn a limit/remaining pair into a reading.
 *
 * Exported and pure so the arithmetic — the part that decides whether an
 * account is told it is about to stop working — is testable without a fetch.
 *
 * A missing pair is `unknown`, never `ok`: see the header comment.
 */
export function readQuota(limit: number | undefined, remaining: number | undefined): QuotaReading {
  if (remaining === undefined && limit === undefined) {
    return {
      state: "unknown",
      message: `Podio sent neither ${LIMIT_HEADER} nor ${REMAINING_HEADER} on this response, ` +
        "so headroom could not be read. This is not evidence of headroom.",
    };
  }
  if (remaining === undefined) {
    return {
      state: "unknown",
      message: `Podio sent ${LIMIT_HEADER} (${limit}) but no ${REMAINING_HEADER}, so how much ` +
        "is left could not be read.",
      quota: [{ id: "requests", limit, unit: "requests" }],
    };
  }

  const quota: HealthQuota[] = [{
    id: "requests",
    ...(limit === undefined ? {} : { limit }),
    remaining,
    unit: "requests",
  }];

  if (remaining === 0) {
    return {
      state: "down",
      message: `Podio request quota exhausted (0 of ${limit ?? "?"} remaining). Podio answers ` +
        `HTTP ${THROTTLED_STATUS} — not 429 — while throttled.`,
      quota,
    };
  }
  if (limit !== undefined && limit > 0 && remaining / limit <= WARN_FRACTION) {
    return {
      state: "degraded",
      message: `Podio request quota low: ${remaining} of ${limit} remaining.`,
      quota,
    };
  }
  return { state: "ok", quota };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request quota headroom",
  description:
    "Reads Podio's X-Rate-Limit-Limit / X-Rate-Limit-Remaining headers off a scope read. " +
    "The header names come from Podio's own PHP client — its API reference documents no " +
    "rate limits at all. Reports unknown, never ok, when the headers are absent.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });

    if (res.status === THROTTLED_STATUS) {
      return {
        state: "down",
        message: `Podio answered HTTP ${THROTTLED_STATUS} — this connection is being ` +
          "throttled right now.",
        quota: [{ id: "requests", remaining: 0, unit: "requests" }],
        ttlSeconds: 60,
      };
    }
    if (!res.ok) {
      // A 401/403 here is a credential problem, which the derived `auth:*`
      // checks report. It says nothing about headroom, so it is `unknown`.
      return { state: "unknown", message: `Podio returned ${res.status} for the scope read` };
    }

    const reading = readQuota(
      parseCount(res.headers.get(LIMIT_HEADER)),
      parseCount(res.headers.get(REMAINING_HEADER)),
    );
    return { ...reading, ttlSeconds: 60 };
  },
};

export default quota;
