/**
 * Is LinkedIn's API platform up? — the same Atlassian Statuspage instance
 * the sibling `linkedin` (member/social) and `linkedin-ads` apps in this
 * pack already probe.
 *
 * Verified live 2026-09-05: `https://www.linkedin-apistatus.com/api/v2/summary.json`
 * answers `200 application/json`, page name "LinkedIn API" — LinkedIn's
 * official developer API status page, covering the platform as a whole
 * rather than a Conversions-API-only feed. LinkedIn publishes no separate
 * status page scoped to the Conversions API alone, so this is the best
 * available signal for "is LinkedIn's API infrastructure up" — the same
 * reasoning both sibling apps used.
 *
 * Note the live response may carry an **empty `components` array** —
 * `status.indicator` (page-level) can be the only populated field. The
 * component-mapping logic below still has to handle that (and any future
 * non-empty list) correctly rather than assuming shape from one observation.
 *
 * Annotation:
 *   - `kind: "service"`, `scope: "app"` (default) — one shared result, not
 *     one per Connection.
 *   - `credential: "none"` (default) — reports even before anyone has
 *     connected.
 *   - `network.allow` — the status host is widened for THIS hook only,
 *     deliberately kept off the app's own `w6w.network.allow`; no Action has
 *     business calling it.
 *   - `severity` left at the `degraded` default: an incident here is
 *     evidence about every Connection, but LinkedIn's platform being briefly
 *     degraded shouldn't hard-fail a workflow target on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "www.linkedin-apistatus.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

/** Statuspage's four rollup indicators. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "LinkedIn API platform status",
  description:
    "Atlassian Statuspage rollup for www.linkedin-apistatus.com, LinkedIn's official developer " +
    "API status page, with per-component detail when the vendor publishes any. Unauthenticated " +
    "and unsigned.",
  kind: "service",
  covers: ["*"],
  // Stated explicitly — it's the precondition for widening `network` below. A
  // status host must never see the auth token.
  credential: "none",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => null) as {
      page?: { url?: string };
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    } | null;
    if (!body) return { state: "unknown", message: "status page returned an unreadable body" };

    // Guard against a future redirect or rebrand pointing this probe at
    // someone else's page entirely.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)linkedin-apistatus\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as LinkedIn's" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[slug(c.name)] = state === "ok" ? { state, message: c.name } : {
        state,
        message: `${c.name}: ${c.status}`,
      };
    }

    const indicator = body.status?.indicator;
    return {
      state: indicator === undefined ? "unknown" : (INDICATOR[indicator] ?? "unknown"),
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
