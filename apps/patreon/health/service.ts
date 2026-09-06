/**
 * Is Patreon up? — Atlassian Statuspage.
 *
 * Verified genuine: `https://status.patreon.com/api/v2/summary.json` and
 * `https://patreon.statuspage.io/api/v2/summary.json` both resolve to the
 * same page (`page.id: "wpqzxrmpvdwd"`, `page.name: "Patreon"`), so this is
 * not the unclaimed-Statuspage-decoy pattern seen for other vendors.
 *
 * The page lists 24 components spanning the whole company (mobile apps,
 * payouts, the marketing site, push notifications, …), most of which say
 * nothing about the REST/OAuth API this app calls. Rather than use the
 * page-level `status.indicator` — which would report this app degraded for,
 * say, an iOS app outage — this check scopes down to the children of the
 * "Developer API" GROUP component specifically: "REST API", "OAuth Identity
 * Provider" and "Webhooks" (its sibling "Documentation" is excluded from the
 * verdict, since the docs site being down does not mean the API is down, but
 * is still reported as a component for visibility). The group is looked up
 * by name each run rather than hardcoding its id, so a future Statuspage
 * reshuffle degrades to `unknown` instead of silently watching the wrong
 * group.
 *
 * - `kind: "service"`, `scope: "app"` (default) — one call, shared across
 *   every Connection; this is not run per-connection.
 * - `credential: "none"` (default) — unauthenticated; reports even before any
 *   Connection exists.
 * - `status.patreon.com` is NOT in `w6w.network.allow` — only this hook can
 *   reach it, via the widened per-check allowlist the spec permits for an
 *   unsigned posture.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.patreon.com";
const GROUP_NAME = "Developer API";
/** Components whose worst state feeds this check's overall `state`. */
const DECISIVE = new Set(["rest-api", "oauth-identity-provider", "webhooks"]);

const service: HealthCheckDefinition = {
  key: "service",
  title: "Patreon platform status",
  description: "Atlassian Statuspage rollup for status.patreon.com, scoped to the Developer API " +
    "group's components (REST API, OAuth Identity Provider, Webhooks). Unauthenticated.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ id?: string; name?: string; status?: string; group_id?: string | null }>;
    };
    const all = body.components ?? [];

    const group = all.find((c) => c.name === GROUP_NAME);
    if (!group?.id) {
      // The group moved or was renamed — do not silently fall back to the
      // page-wide indicator, which would mix in unrelated components.
      return { state: "unknown", message: `"${GROUP_NAME}" component group not found` };
    }

    const children = all.filter((c) => c.group_id === group.id && c.name);
    const components: Record<string, { state: HealthState }> = {};
    const decisiveStates: HealthState[] = [];
    for (const c of children) {
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      const key = slug(c.name!);
      components[key] = { state };
      if (DECISIVE.has(key)) decisiveStates.push(state);
    }

    if (decisiveStates.length === 0) {
      return {
        state: "unknown",
        message: "no recognized API components under the group",
        components,
      };
    }

    const rank: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
    const worst = decisiveStates.reduce((a, b) => (rank[b] > rank[a] ? b : a), "ok" as HealthState);

    return {
      state: worst,
      message: worst === "ok" ? undefined : body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
