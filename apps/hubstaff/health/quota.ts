import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";

/**
 * How much of this token's request budget is left — Hubstaff.
 *
 * ## What is documented, and what was actually on the wire
 *
 * Hubstaff's pagination-and-rate-limits guide
 * (<https://developer.hubstaff.com/pagination-rate-limits/>, read 2026-09-22)
 * documents three response headers and a per-token window:
 *
 *   | Header | Meaning |
 *   | ------ | ------- |
 *   | `X-Rate-Limit-Limit` | Total requests permitted per window |
 *   | `X-Rate-Limit-Remaining` | Requests remaining in the current window |
 *   | `X-Rate-Limit-Reset` | Unix timestamp when the window resets |
 *
 * "By default, you can issue up to 120 requests per minute across most
 * endpoints. Heavier endpoints (activities, screenshots) have lower limits."
 * Exceeding it answers `429` with `Retry-After`.
 *
 * What could be confirmed on the wire is narrower: the OpenAPI document at
 * `https://api.hubstaff.com/v2/docs` declares **no response headers at all**
 * (every `responses[].headers` in the 510,300-byte document is empty — checked
 * exhaustively), and the two live `401` responses reproduced on 2026-09-22 (no
 * `Authorization` header, and `Bearer hsoat_not_a_real_token_zzz`) carried none
 * of the three `X-Rate-Limit-*` headers. An authenticated response could not be
 * obtained during research, so whether the remaining count really arrives could
 * not be verified.
 *
 * ## Why that still argues for a probe, and why it is harmless when empty
 *
 * The headers are documented, they are per **access token** (so they are a
 * per-Connection reading, not a per-App one), and the probe is the same cheap
 * `GET /v2/organizations` the auth hook already uses. If Hubstaff sends them,
 * this reports real headroom; if it does not, the check reports `unknown` with
 * a message naming exactly which header was missing, and **nothing else
 * happens** — see below.
 *
 * ## Severity is load-bearing
 *
 * `severity: "informational"`: the budget is context ("why am I about to start
 * getting 429s"), never a verdict, and — more importantly — the `unknown` this
 * check returns when the headers are absent must not pin every Connection's
 * verdict at `unknown` forever. An `informational` check never worsens a
 * roll-up.
 *
 * `scope: "connection"` and `credential: "signed"` are this kind's defaults and
 * both are correct: the allowance belongs to the token, and reading it needs
 * the token on the wire. Signing is safe because the probe stays on the app's
 * own egress allowlist.
 */
import { API_BASE, API_PREFIX } from "../lib/client.ts";

export const QUOTA_PROBE_PATH = "/organizations";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** `X-Rate-Limit-Reset` is a Unix timestamp in seconds. */
const epochToIso = (v: string | null): string | undefined => {
  const n = num(v);
  if (n === undefined || n <= 0) return undefined;
  return new Date(n * 1000).toISOString();
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start getting 429s.
 */
export function headroomState(remaining?: number, limit?: number): HealthState {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  description: "Requests remaining in the current window, read from the X-Rate-Limit-Limit / " +
    "X-Rate-Limit-Remaining / X-Rate-Limit-Reset response headers on a cheap " +
    "GET /v2/organizations. Hubstaff documents 120 requests/minute per access token by " +
    "default, lower on activities and screenshots.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${QUOTA_PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }

    const h = res.headers;
    const remaining = num(h.get("x-rate-limit-remaining"));
    const limit = num(h.get("x-rate-limit-limit"));
    const resetAt = epochToIso(h.get("x-rate-limit-reset"));

    if (remaining === undefined && limit === undefined) {
      return {
        state: "unknown",
        message:
          "Response carried no X-Rate-Limit-Limit / X-Rate-Limit-Remaining header. Hubstaff " +
          "documents both, but its OpenAPI document declares no response headers and the " +
          "unauthenticated 401s carried none, so headroom is unreadable here.",
      };
    }

    const readings: HealthQuota[] = [];
    if (limit !== undefined || remaining !== undefined) {
      readings.push({
        id: "requests",
        limit,
        remaining,
        resetAt,
        unit: "requests",
      });
    }

    return {
      state: headroomState(remaining, limit),
      quota: readings,
      ttlSeconds: 60,
    };
  },
};

export default quota;
