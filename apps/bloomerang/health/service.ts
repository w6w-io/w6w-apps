/**
 * Is Bloomerang's CRM API up? — Atlassian Statuspage, scoped to the exact
 * component this app calls.
 *
 * Annotation:
 *
 *   - `kind: "service"` — a different question from "is this credential live"
 *     (the derived `auth:api-key` check) or "is there quota left" (declared
 *     absent in `quota.ts`).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection.
 *   - `credential: "none"` (also the default) — unsigned, reports before
 *     anyone has connected.
 *   - `network.allow` widens egress for this hook ONLY, to the status host —
 *     an Action has no business calling it.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * ## Verifying the page is real, and picking the right component
 *
 * `bloomerang.statuspage.io` (linked from Bloomerang's own site footer as
 * "System Status") is a genuinely claimed Statuspage instance — verified
 * 2026-09-01: `GET /api/v2/summary.json` returns a real `page.id`
 * (`v5y674dmtys4`) and `page.name: "Bloomerang"`, while an invented sibling
 * path (`/api/v2/notarealpath.json`) 404s. That rules out an unclaimed-decoy
 * page or an HTML catch-all.
 *
 * The page lists **28 components** spanning the CRM app, the Volunteer app,
 * the Fundraising app (Qgiv), third-party dependencies (AWS, SendGrid), and
 * support channels — most of which say nothing about this app's REST API.
 * One component is exact: **`CRM API - api.bloomerang.co`**, grouped under
 * "Bloomerang CRM". This check reads that component specifically rather than
 * the page-wide rollup, so an incident in, say, the Volunteer app or a
 * third-party AWS dependency does not report this app's own API as degraded
 * when it is not.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const STATUS_HOST = "bloomerang.statuspage.io";

/** The exact component name for this app's API surface, confirmed live. */
const COMPONENT_NAME = "CRM API - api.bloomerang.co";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Bloomerang CRM API status",
  description:
    `Atlassian Statuspage rollup for ${STATUS_HOST}, scoped to the "${COMPONENT_NAME}" ` +
    "component rather than the page-wide indicator. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { description?: string };
      components?: Array<{ name?: string; status?: string }>;
    };

    const component = body.components?.find((c) => c.name === COMPONENT_NAME);
    if (!component) {
      return { state: "unknown", message: `component "${COMPONENT_NAME}" not found in feed` };
    }

    return {
      state: COMPONENT[component.status ?? ""] ?? "unknown",
      message: body.status?.description,
      components: { "crm-api": { state: COMPONENT[component.status ?? ""] ?? "unknown" } },
      ttlSeconds: 60,
    };
  },
};

export default service;
