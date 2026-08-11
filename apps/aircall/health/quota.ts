/**
 * How much of this company's 120 requests/minute is left?
 *
 * ## The qualifier that decides the whole design
 *
 * Aircall's rate-limiting section reads: *"Aircall limits the number of requests
 * to its Public API to 120 requests per minute per company. The following
 * headers are available in API headers' responses **when the rate limit has been
 * reached**"* — then lists `X-AircallApi-Limit`, `X-AircallApi-Remaining` and
 * `X-AircallApi-Reset`.
 *
 * That qualifier admits two readings and they lead to opposite checks:
 *
 *  1. *The headers are on every response; the sentence just explains when you'd
 *     care.* Then this is an ordinary headroom probe.
 *  2. *The headers appear only once you are at or past the limit.* Then their
 *     absence is the normal state and carries no number at all.
 *
 * This app cannot settle it: the headers can only be observed on a **successful,
 * authenticated** response, and every unauthenticated probe is rejected at the
 * AWS edge before Aircall's application runs. Measured 2026-08-11, a `403` from
 * `GET /v1/ping` carries `content-type`, `content-length`, `date`,
 * `apigw-requestid`, `x-cache`, `via`, `x-amz-cf-pop` and `x-amz-cf-id` — and
 * none of the three `X-AircallApi-*` headers, which proves nothing either way
 * because that response never reached the tier that would set them.
 *
 * So this check **reads the headers if they are there and says so plainly if
 * they are not**, rather than guessing. Under reading (1) it reports real
 * headroom on every run. Under reading (2) it reports `unknown` until the
 * company is actually rate-limited, and then reports the reset window — which is
 * the moment the number matters most.
 *
 * ## Why `severity: "informational"`
 *
 * Load-bearing, and for the same reason a declared absence carries it: `unknown`
 * outranks `ok` in the roll-up. Under reading (2) the steady state of this check
 * is `unknown`, and at any other severity that would pin the App's verdict at
 * `unknown` forever — reporting a perfectly healthy Aircall account as
 * unverifiable because its vendor is stingy with headers. The credential
 * question is answered by the derived `auth:basic` check and the platform
 * question by `service`; neither depends on this one.
 *
 * ## Why it rides on `/v1/ping`
 *
 * The limit is **per company, not per API key**, so this check is measuring a
 * budget shared with every other integration on the account — and spending two
 * requests to measure one budget would be self-defeating. `/v1/ping` is the
 * cheapest authenticated call Aircall publishes and its body (`{"ping":"pong"}`)
 * carries nothing that has to be scrubbed. `minIntervalSeconds: 60` keeps the
 * cost at 1 of 120.
 */
import type { HealthCheckDefinition, HealthQuota, HealthReport } from "@w6w/types";
import { API_BASE, V1 } from "../lib/client.ts";

export const PING_URL = `${API_BASE}${V1}/ping`;

/** Documented header names, spelled exactly as the reference spells them. */
export const LIMIT_HEADER = "x-aircallapi-limit";
export const REMAINING_HEADER = "x-aircallapi-remaining";
export const RESET_HEADER = "x-aircallapi-reset";

/** Aircall's published ceiling, per company. Used only to caption a reading. */
export const DOCUMENTED_LIMIT = 120;

/** Remaining at or below this fraction of the limit is worth flagging. */
export const WARN_FRACTION = 0.1;

/**
 * Parse `X-AircallApi-Reset` into an ISO 8601 instant.
 *
 * The reference says only "Timestamp when the counter will be reset" and does
 * not state the unit, so both are handled: a value below 1e12 is read as UNIX
 * **seconds** (1e12 seconds is the year 33658, so no real second-timestamp can
 * reach it) and anything larger as milliseconds. Anything unparseable yields
 * `undefined` rather than an invalid date — a `resetAt` of `"Invalid Date"`
 * renders as a real answer and is worse than no answer.
 *
 * Exported because this conversion is the part most likely to be silently wrong
 * for a year.
 */
export function parseResetAt(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const ms = n < 1e12 ? n * 1000 : n;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

/** A finite non-negative integer, or `undefined`. */
export function parseCount(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw.trim());
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Turn a set of response headers into a report.
 *
 * Exported and pure so the arithmetic — the part that decides whether an
 * account is told it is about to start getting 429s — is testable without a
 * fetch.
 */
export function readHeadroom(headers: Headers): HealthReport {
  const limit = parseCount(headers.get(LIMIT_HEADER));
  const remaining = parseCount(headers.get(REMAINING_HEADER));
  const resetAt = parseResetAt(headers.get(RESET_HEADER));

  if (remaining === undefined) {
    return {
      state: "unknown",
      message:
        `Aircall sent no ${REMAINING_HEADER} header. The reference documents the X-AircallApi-* ` +
        `headers as present "when the rate limit has been reached", so this is the expected ` +
        `steady state and not a fault. The published ceiling is ${DOCUMENTED_LIMIT} requests per ` +
        "minute per company, shared across every integration on the account.",
      ttlSeconds: 60,
    };
  }

  const quota: HealthQuota = {
    id: "requests-per-minute",
    limit: limit ?? DOCUMENTED_LIMIT,
    remaining,
    unit: "requests",
    ...(resetAt ? { resetAt } : {}),
  };

  const ceiling = quota.limit ?? DOCUMENTED_LIMIT;
  // A non-positive ceiling is a malformed header, not "no headroom" — reading it
  // the other way reports every account as exhausted the day Aircall ships a
  // typo.
  if (ceiling <= 0) {
    return {
      state: "unknown",
      message: `Aircall reported a non-positive rate limit (${ceiling})`,
      quota: [quota],
      ttlSeconds: 60,
    };
  }

  const caption = `${remaining}/${ceiling} requests remaining this minute` +
    (resetAt ? `, resetting at ${resetAt}` : "");

  if (remaining === 0) {
    return {
      state: "degraded",
      // Exhausted, not `down`: the window is a minute wide and refills on its
      // own, so this is a queue, not an outage. Reporting `down` for a
      // self-healing 60-second condition would page someone for nothing.
      message: `Aircall's per-company rate limit is exhausted — ${caption}`,
      quota: [quota],
      ttlSeconds: 30,
    };
  }
  if (remaining / ceiling <= WARN_FRACTION) {
    return {
      state: "degraded",
      message: `Aircall's per-company rate limit is nearly exhausted — ${caption}`,
      quota: [quota],
      ttlSeconds: 30,
    };
  }
  return { state: "ok", message: caption, quota: [quota], ttlSeconds: 60 };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  description:
    "Reads X-AircallApi-Limit / -Remaining / -Reset off a signed GET /v1/ping. The limit is 120 " +
    "requests per minute per COMPANY, shared with every other integration on the account — not " +
    "per API key.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  // See the module comment: under the vendor's own reading of its header
  // documentation, `unknown` is this check's steady state, and `unknown`
  // outranks `ok` in the roll-up.
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PING_URL, { headers: { accept: "application/json" } });

    if (res.status === 429) {
      // The one case where the headers are unambiguously supposed to be
      // present, per the vendor's own sentence. Read them off the refusal.
      const report = readHeadroom(res.headers);
      return {
        ...report,
        state: "degraded",
        message: `Aircall is currently rate-limiting this company (429). ${report.message ?? ""}`
          .trim(),
      };
    }
    if (!res.ok) {
      // A rejected credential says nothing about headroom. That is the
      // `auth:basic` check's question, and answering it twice with two
      // different verdicts is how one problem gets reported as two.
      return {
        state: "unknown",
        message: `Aircall returned ${res.status} for /v1/ping, so headroom could not be read`,
      };
    }
    return readHeadroom(res.headers);
  },
};

export default quota;
