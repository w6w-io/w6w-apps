/**
 * How much headroom is left on THIS credential — Kustomer.
 *
 * - `kind: "quota"` — a different question from liveness (the derived
 *   `auth:*` check already answers "is the credential live").
 * - `scope: "connection"`, `credential: "signed"` — this kind's defaults,
 *   both correct: the allowance belongs to the credential, and reading it
 *   needs the credential on the wire. Signing is safe because the probe
 *   stays on the app's own egress allowlist (`*.api.kustomerapp.com`); this
 *   check declares no `network.allow` of its own.
 * - `severity: "informational"` — running low is worth showing, never worth
 *   failing a verdict over.
 *
 * Probe: `GET /v1/users/current`, the same scope-free whoami the auth `test`
 * hook uses. Every Kustomer response carries `x-ratelimit-limit` and
 * `x-ratelimit-remaining` — verified against the vendor's own Rate limiting
 * reference page — so no separate endpoint is needed to read them.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl, domainFromConnection } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Headroom is context, not a verdict — `severity: "informational"` keeps this from worsening a roll-up. */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Per-organization allowance remaining, read off the `x-ratelimit-*` headers on the whoami probe.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let org: string;
    try {
      org = domainFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "connection records no org subdomain" };
    }

    // `credential: "signed"` (this kind's default) means the runtime already
    // ran the auth `sign` hook on this outbound request.
    const res = await ctx.fetch(`${baseUrl(org)}/users/current`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{ id: "org", limit, remaining, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
