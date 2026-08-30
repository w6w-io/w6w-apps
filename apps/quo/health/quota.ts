import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, parseRateLimit } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

/**
 * How much of the per-second request budget is left.
 *
 * Quo's own "Rate limits" doc states a flat ceiling — "Each API key may make up to 10 requests
 * per second" — with no mention of a response header. Measured live on 2026-08-30, headers ARE
 * present anyway, on both a 401 and a 200: `ratelimit: "per-second"; r=9; t=1` and
 * `ratelimit-policy: "per-second"; q=10; w=1` — the IETF rate-limit-headers draft, not
 * `X-RateLimit-*`, and present even when unsigned (so this check would work unauthenticated too,
 * but is declared `signed` since the budget is genuinely per API key, and reading it that way is
 * the honest posture).
 *
 * Ten requests/second is a small budget for a workflow host issuing several calls per run, so
 * this is worth surfacing even though Quo's own docs never promise the header exists.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Per-second request headroom",
  description: "Reads Quo's IETF-draft `ratelimit`/`ratelimit-policy` response headers — a flat " +
    "10 requests/second per API key, undocumented but present on every response measured.",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach Quo: ${String(err)}` };
    }
    await res.body?.cancel();

    if (!res.ok) {
      return {
        state: "unknown",
        message: `Quo returned HTTP ${res.status} for the probe — cannot read headroom`,
      };
    }

    const { remaining, resetsIn, quota: allowance, window } = parseRateLimit(
      res.headers.get("ratelimit"),
      res.headers.get("ratelimit-policy"),
    );
    if (remaining === undefined || allowance === undefined || allowance <= 0) {
      return {
        state: "unknown",
        message: "Quo did not return its ratelimit/ratelimit-policy headers on this response — " +
          "these are undocumented, so a proxy stripping unknown headers would look identical",
      };
    }

    const detail = `${remaining} of ${allowance} requests left` +
      (window ? ` per ${window}s window` : "") +
      (resetsIn !== undefined ? `, resetting in ${resetsIn}s` : "");

    if (remaining <= 0) {
      return { state: "down", message: `${detail} — requests are being throttled until the reset` };
    }
    if (remaining <= allowance * 0.2) {
      return { state: "degraded", message: detail };
    }
    return { state: "ok", message: detail, ttlSeconds: 60 };
  },
};

export default quota;
