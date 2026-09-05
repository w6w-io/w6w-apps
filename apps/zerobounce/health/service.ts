/**
 * Is ZeroBounce up? — Atlassian Statuspage.
 *
 * Verified live 2026-09-05: `https://status.zerobounce.net/api/v2/summary.json`
 * is a genuine, claimed Statuspage instance (`page.name: "Status Updates |
 * ZeroBounce"`), not one of this pack's known decoy shapes. It carries three
 * components that map exactly onto this app's three regional hosts (see
 * `lib/client.ts`):
 *
 *   - `API`     → `api.zerobounce.net`    (this app's default host)
 *   - `API-US`  → `api-us.zerobounce.net`
 *   - `API-EU`  → `api-eu.zerobounce.net`
 *
 * Plus several components this check ignores as out of scope for an
 * API-calling App: `Website Members Section`, `Website & Documents`,
 * `Stripe JS` (billing widget), and three named Cloudflare PoPs.
 *
 * `kind: "service"` / `scope: "app"` / `credential: "none"` (all defaults for
 * this kind) — the answer is identical for every Connection, so it is
 * computed once and shared, and it reports even before anyone has connected.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.zerobounce.net";

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

/** Statuspage's page-level rollup indicator. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** This app's three regional API components, mapped to this check's component ids. */
const TRACKED: Record<string, string> = {
  "API": "api",
  "API-US": "api-us",
  "API-EU": "api-eu",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "ZeroBounce platform status",
  description:
    "Atlassian Statuspage rollup for status.zerobounce.net, scoped to the API/API-US/API-EU " +
    "components matching this app's three regional hosts. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      const id = c.name ? TRACKED[c.name] : undefined;
      if (!id) continue;
      components[id] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    // The default host (`API`) decides the overall state — it is the host
    // every action here uses unless a caller opts into `region`. When the
    // component list carries no `API` entry at all, fall back to the
    // page-level indicator rather than reporting `unknown` on a page that
    // did answer.
    const apiState = components["api"]?.state;
    const state = apiState ?? INDICATOR[body.status?.indicator ?? ""] ?? "unknown";

    return {
      state,
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
