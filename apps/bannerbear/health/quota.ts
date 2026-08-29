/**
 * How much of this workspace's render quota is left this billing period?
 *
 * `GET /account` returns `quota: {max, current, remaining}` directly — no
 * separate limits endpoint the way Apify needs one, and no response header to
 * read instead. The vendor's own reference page states plainly: "The response
 * also describes... current usage levels. Usage resets at the start of every
 * month."
 *
 * ## Same endpoint as the credential probe, on purpose
 *
 * `auth/bearer-token.ts` probes `/account` too, for the same reason this check
 * reads it: it needs no resource scope (see that file's doc comment), so it is
 * simultaneously the right liveness probe and the only source of render
 * headroom. `minIntervalSeconds` keeps the combined cost to one call a minute
 * per Connection.
 *
 * ## What `max: 0` (or absent) means
 *
 * Bannerbear's Pay As You Go plans meter renders against a purchased credit
 * balance rather than a fixed monthly cap in every case; a `max` of `0` or a
 * response with no `quota` object at all is read as "no ceiling to report
 * against", not "zero renders left" — the opposite reading would report every
 * such workspace as permanently exhausted.
 *
 * Bannerbear documents no separate request-rate header (see `lib/client.ts`'s
 * module doc for the flat "60 POST/10s" limit, which has no header to poll) —
 * so unlike some vendors in this pack, there is no second `request-rate`
 * check here to declare unavailable; this is the one and only quota surface
 * the API exposes, and it is a real probe.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { authHeaders, PROBE_PATH } from "../auth/bearer-token.ts";

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

interface AccountBody {
  plan?: string;
  quota?: { max?: number; current?: number; remaining?: number };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Render quota headroom",
  description: "Current vs. max renders this billing period, read from GET /account.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({}) },
    });
    if (!res.ok) {
      // A 403/404 here says nothing about headroom — never `down`.
      return { state: "unknown", message: `Bannerbear returned ${res.status} for /account` };
    }

    const body = await res.json().catch(() => null) as AccountBody | null;
    const max = body?.quota?.max;
    const current = body?.quota?.current;
    const remaining = body?.quota?.remaining;

    if (typeof max !== "number" || typeof current !== "number") {
      return { state: "unknown", message: "/account response carried no quota object" };
    }

    // A non-positive ceiling is "not metered this way" (e.g. Pay As You Go
    // credit balance), not "exhausted".
    if (max <= 0) {
      return {
        state: "ok",
        quota: [{ id: "renders", limit: max, remaining: remaining ?? 0, unit: "renders" }],
      };
    }

    const fraction = current / max;
    let state: HealthState = "ok";
    let message: string | undefined;
    if (fraction >= 1) {
      state = "down";
      message = `render quota exhausted: ${current}/${max} (100%)`;
    } else if (fraction >= WARN_FRACTION) {
      state = "degraded";
      message = `render quota at ${current}/${max} (${Math.round(fraction * 100)}%)`;
    }

    return {
      state,
      message,
      quota: [{
        id: "renders",
        limit: max,
        remaining: remaining ?? Math.max(0, max - current),
        unit: "renders",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
