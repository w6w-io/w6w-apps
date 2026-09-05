/**
 * How much of this token's Recharge rate-limit budget is left?
 *
 * ## Undocumented header, confirmed live
 *
 * The reference states in prose that "some of our API resources and
 * endpoints may be limited" and paces its own SDK code samples with
 * `sleep(1)`, but nowhere names a header. A live probe against
 * `GET /token_information` on 2026-09-05 found one anyway: every response
 * signed with a token — including an outright-rejected one — carries
 * `x-recharge-limit: <used>/<cap>`, and the counter visibly increments
 * across requests (`1/40`, `2/40`, `3/40` on three consecutive calls with the
 * same fake token). No `X-RateLimit-Reset` or window length is exposed
 * anywhere, so this check reports the used/cap pair and nothing it cannot
 * measure.
 *
 * The header appeared only once an `X-Recharge-Access-Token` header — even a
 * wrong one — was present on the request; a wholly unauthenticated call
 * carried no such header. That is why this check is `credential: "signed"`
 * rather than `"none"`: the budget is evidently tracked per credential (or at
 * least per presented-token bucket), not globally.
 *
 * ## Same endpoint as the credential probe, on purpose
 *
 * `auth/api-token.ts` also calls `/token_information` — deliberately, not by
 * accident: it is the one endpoint in this app's surface that needs no scope
 * at all, so it is reachable regardless of how narrowly a token is scoped,
 * which makes it simultaneously the right liveness probe and a safe place to
 * read this header. `minIntervalSeconds` keeps the added cost to one call a
 * minute.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE, API_VERSION } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-token.ts";

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

/** Parse `"<used>/<cap>"`. Returns `undefined` if the header is missing or malformed. */
export function parseLimitHeader(
  value: string | null,
): { used: number; cap: number } | undefined {
  if (!value) return undefined;
  const m = value.match(/^(\d+)\/(\d+)$/);
  if (!m) return undefined;
  const used = Number(m[1]);
  const cap = Number(m[2]);
  if (!Number.isFinite(used) || !Number.isFinite(cap) || cap <= 0) return undefined;
  return { used, cap };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description: "Requests used against the store's per-token rate-limit budget this window, " +
    "read from the undocumented but live x-recharge-limit response header on " +
    "GET /token_information.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", "x-recharge-version": API_VERSION },
    });

    const reading = parseLimitHeader(res.headers.get("x-recharge-limit"));
    if (!reading) {
      // Not a failure of the credential (that is `auth:api-token`'s job) — just
      // no rate-limit signal to report on this response.
      return { state: "unknown", message: "no x-recharge-limit header on the response" };
    }

    const { used, cap } = reading;
    const remaining = Math.max(0, cap - used);
    const fraction = used / cap;

    let state: HealthState = "ok";
    let message: string | undefined;
    if (fraction >= 1) {
      state = "degraded";
      message = `at the rate limit (${used}/${cap})`;
    } else if (fraction >= WARN_FRACTION) {
      state = "degraded";
      message = `near the rate limit (${used}/${cap}, ${Math.round(fraction * 100)}%)`;
    }

    return {
      state,
      message,
      quota: [{ id: "requests", limit: cap, remaining, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
