/**
 * How much daily API credit headroom is left on THIS connection — Zoho Desk.
 *
 * Unlike `zohobooks` (which documents real limits but exposes NO response
 * header at all), Zoho Desk publishes real per-response headers — verified
 * 2026-08-25 against `https://desk.zoho.com/DeskAPIDocument#Introduction`'s
 * "Ratelimit Response Headers" section:
 *   - `X-Rate-Limit-Remaining-v3` — credits left for the portal for the
 *     current day.
 *   - `X-Rate-Limit-Request-Weight-v3` — credits the specific call just cost
 *     (Desk's calls are WEIGHTED — a shallow list page costs ~3 credits, the
 *     same page 10,000 records deep can cost up to 50, so two calls to the
 *     same endpoint are not equal spend).
 *   - `Retry-After` — appears only once the daily limit is hit, seconds to
 *     wait.
 * A live unauthenticated probe carries none of these (checked 2026-08-25 —
 * a 401 response has no rate-limit headers at all), so this can only be
 * confirmed against a real credential; the parsing below is defensive about
 * that.
 *
 * There is no fixed number to compare `remaining` against: Zoho Desk's base
 * daily credit allocation varies by edition (Free/Standard/Professional/
 * Enterprise) and by purchased add-on credits, unlike a flat per-plan ceiling
 * — the docs describe a paid tier reaching millions of credits/day. Absent a
 * documented total, this reports `down` only once the budget is fully
 * exhausted (`remaining <= 0`, the state a caller cannot work around) and
 * `degraded` under a conservative fixed floor rather than guessing a
 * percentage of an unknown ceiling.
 *
 * Annotation:
 *   - `kind: "quota"`. The derived `auth:oauth2-<region>` check already
 *     answers "is the credential live"; this answers "will the next call
 *     succeed before Zoho starts returning 429s".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the org behind
 *     the credential, and reading it needs the credential on the wire.
 *     Signing is safe because the probe stays on the app's own egress
 *     allowlist — this check declares no `network.allow` of its own.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /organizations` — the cheapest authenticated call this app
 * knows (needs only `Desk.organization.READ`/`Desk.basic.READ`, the same
 * scope `auth/oauth2.ts`'s `test` hook probes, and — uniquely among Desk
 * endpoints — no `orgId` header).
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_PREFIX, apiHostFromConnection } from "../lib/client.ts";

const headroom = (remaining: number): HealthState => {
  if (remaining <= 0) return "down";
  if (remaining < 50) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Daily API credit headroom",
  description:
    "Reads `X-Rate-Limit-Remaining-v3` off `GET /organizations`. Zoho Desk's daily credit " +
    "allocation varies by edition and add-ons, so this reports `down` only once fully " +
    "exhausted and `degraded` under a conservative fixed floor.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const host = apiHostFromConnection(ctx.connection);
    const res = await ctx.fetch(`https://${host}${API_PREFIX}/organizations`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const header = res.headers.get("x-rate-limit-remaining-v3");
    if (header === null) {
      return {
        state: "unknown",
        message: "no X-Rate-Limit-Remaining-v3 header on the response",
      };
    }

    const remaining = Number(header);
    if (!Number.isFinite(remaining)) {
      return { state: "unknown", message: `unparseable X-Rate-Limit-Remaining-v3: "${header}"` };
    }
    return {
      state: headroom(remaining),
      quota: [{ id: "daily-credits", remaining, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
