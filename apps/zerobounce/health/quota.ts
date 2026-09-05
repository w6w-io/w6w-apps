/**
 * How many validation credits does this account have left?
 *
 * `GET /v2/getcredits` — the same free, non-echoing call `auth/api-key.ts`
 * uses for credential liveness — returns `{"Credits": <number>}`. There is
 * no separate `limit`/plan-allocation field documented anywhere in the
 * vendor's docs (credits are purchased in packs rather than granted as a
 * recurring monthly quota), so this check reports `remaining` only, with no
 * `limit` and therefore no percentage-based early warning the way a
 * capped-quota vendor would support.
 *
 * `-1` is documented as "your API Key is invalid" — a credential problem,
 * not an empty balance — and is already covered by the derived
 * `auth:api-key` check, so this check reports it as `unknown` rather than
 * `down` (which is reserved for a *verified* zero balance) to avoid
 * double-counting the same failure as two different kinds of health problem.
 *
 * `severity: "informational"`: running low is worth surfacing, never worth
 * failing a verdict on its own — a `422`/error response from `validate`
 * itself already tells a caller precisely when a run has to stop.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { HOSTS } from "../lib/client.ts";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Validation credit balance",
  description: "Remaining validation credits, read from GET /v2/getcredits.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const url = new URL(`https://${HOSTS.default}/v2/getcredits`);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    const text = await res.text();

    let body: { Credits?: number } | null = null;
    try {
      body = JSON.parse(text) as { Credits?: number };
    } catch {
      // Not JSON — fall through to `unknown` below.
    }

    if (!body || typeof body.Credits !== "number") {
      return {
        state: "unknown",
        message: `ZeroBounce returned ${res.status}: ${text || res.statusText}`,
      };
    }

    if (body.Credits === -1) {
      return { state: "unknown", message: "Credits: -1 — invalid API key (see auth:api-key)" };
    }

    return {
      state: body.Credits <= 0 ? "down" : "ok",
      message: body.Credits <= 0 ? "0 credits remaining" : undefined,
      quota: [{ id: "credits", remaining: body.Credits, unit: "credits" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
