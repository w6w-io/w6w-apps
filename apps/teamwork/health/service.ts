/**
 * Is Teamwork Projects up? — Atlassian Statuspage.
 *
 * Verified live 2026-08-30: `status.teamwork.com/api/v2/summary.json` is a
 * real Statuspage instance (`page.name: "Teamwork.com"`), and
 * `status.teamwork.com/api/v2/components.json` lists a "Teamwork Projects" GROUP with two children,
 * "Teamwork Projects - US region" and "Teamwork Projects - EU Region" —
 * alongside unrelated components for Teamwork Desk, Chat, Spaces, CRM and the
 * marketing/docs sites. This app is the Projects product, so the check reads
 * only the "Teamwork Projects" group's own indicator rather than the whole
 * page's rollup, which would report a Desk or Chat outage as an outage here.
 *
 * Annotation:
 *   - `kind: "service"` — a different question from "is this credential
 *     live" (the derived `auth:api-key` check) or "is there quota left"
 *     (`quota`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for
 *     every Connection.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs.
 *   - `network.allow` widens the egress allowlist for this hook only, to the
 *     status host — never restated for an action, and never signed.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a verdict on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const worst = (a: HealthState, b: HealthState): HealthState => {
  const rank: Record<HealthState, number> = { ok: 0, degraded: 1, down: 2, unknown: 3 };
  return rank[b] > rank[a] ? b : a;
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.teamwork.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Teamwork Projects platform status",
  description:
    'Atlassian Statuspage rollup for the "Teamwork Projects" component group at status.teamwork.com — Desk, Chat, Spaces and CRM are separate Teamwork products and are not read. Unauthenticated and unsigned.',
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a
    // lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      components?: Array<{ id?: string; name?: string; status?: string; group_id?: string | null }>;
    };
    const all = body.components ?? [];
    const group = all.find((c) => c.name === "Teamwork Projects" && !c.group_id);
    if (!group?.id) {
      return { state: "unknown", message: "status page has no Teamwork Projects group" };
    }

    const children = all.filter((c) => c.group_id === group.id);
    if (!children.length) {
      return { state: "unknown", message: "Teamwork Projects group has no region components" };
    }

    const components: Record<string, { state: HealthState }> = {};
    let worstState: HealthState = "ok";
    for (const c of children) {
      if (!c.name) continue;
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[slug(c.name)] = { state };
      worstState = worst(worstState, state);
    }

    // `components.json` gives every entry — including the group header — a
    // component-status value (operational / degraded_performance / ...), not
    // the page-level `none`/`minor`/`major`/`critical` indicator that only
    // `summary.json`'s top-level `status` object carries. The group's own
    // status already rolls up its children, so it is read directly; the
    // per-child fold is kept only as a fallback and for the `components` detail.
    const groupState = COMPONENT[group.status ?? ""];
    return {
      state: groupState ?? worstState,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
