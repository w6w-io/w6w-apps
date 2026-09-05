/**
 * Is Workable up? — Atlassian Statuspage, confirmed live 2026-09-05:
 * `status.workable.com` 301s to `workable.statuspage.io`, which carries a
 * genuine `Workable Recruiting` component group (not an unclaimed decoy) with
 * "Recruiting and applicant tracking" as its most relevant member — the only
 * component that maps onto what this app's SPI v3 endpoints (jobs,
 * candidates, stages) actually touch. There is no component named plainly
 * "API".
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — a different question from "is this credential
 *     live" (the derived `auth:*` check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — identical for every Connection,
 *     so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` widens egress for this hook only, to the Statuspage
 *     host — never the app's own allowlist, and safe only because the
 *     posture here is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "workable.statuspage.io";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Workable platform status",
  description:
    "Atlassian Statuspage rollup for workable.statuspage.io, anchored on the 'Recruiting and " +
    "applicant tracking' component this app's endpoints actually touch. Unauthenticated.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      if (!c.name || c.group) continue;
      components[slug(c.name)] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    // The overall page indicator can be "none" while the one component this
    // app cares about is degraded (Workable runs many products on one page) —
    // fold that component's own state in rather than trusting the page-wide
    // indicator alone.
    const relevant = components["recruiting-and-applicant-tracking"]?.state;
    const pageState = INDICATOR[body.status?.indicator ?? ""] ?? "unknown";
    const rank: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
    const state = relevant && rank[relevant] > rank[pageState] ? relevant : pageState;

    return {
      state,
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
