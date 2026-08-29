/**
 * How much per-minute rate-limit headroom is left on THIS credential.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will
 *     the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the
 *     credential, and reading it needs the credential on the wire. Signing
 *     is safe because the probe stays on the app's own egress allowlist —
 *     this check declares no `network.allow` of its own.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /v2/me`, the same scope-free call the auth `test` hooks use.
 *
 * Verified against developers.salesloft.com/docs/platform/api-basics/rate-limits
 * (2026-08-29): Salesloft meters cost-per-minute on a TEAM level (not per
 * integration/credential — another integration on the same team can spend
 * the same budget), at a documented 600 cost/minute default that Salesloft
 * can raise or lower per customer or per team. Two response headers carry
 * the live reading:
 *
 *   - `x-ratelimit-remaining-minute` — requests left in the current window.
 *   - `x-ratelimit-endpoint-cost` — the cost of the request just executed.
 *
 * No header carries the total allowance, and the 600/minute figure is a
 * default that can be silently overridden per team — so `limit` is left
 * undefined rather than hardcoding a number Salesloft explicitly says can
 * change without notice for this credential's own team.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means
 * this state never worsens a roll-up. It is reported honestly anyway so a UI
 * can show why a workflow is about to start getting 429s. With no limit
 * header to compute a ratio against, only the hard-zero case is flagged.
 */
const headroom = (remaining?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description: "Requests remaining in the current per-minute cost window, read off the " +
    "x-ratelimit-remaining-minute response header. Salesloft's rate limit is per-TEAM, so " +
    "another integration on the same team can spend this same budget.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const remaining = num(res.headers.get("x-ratelimit-remaining-minute"));
    const cost = num(res.headers.get("x-ratelimit-endpoint-cost"));
    if (remaining === undefined) {
      return {
        state: "unknown",
        message: "response carried no x-ratelimit-remaining-minute header",
      };
    }

    return {
      state: headroom(remaining),
      quota: [{
        id: "minute",
        remaining,
        unit: cost !== undefined ? `requests (last cost ${cost})` : "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
