/**
 * Is Judge.me up?
 *
 * `status.judge.me` is a genuine, claimed Atlassian Statuspage — verified
 * 2026-09-05: `GET https://status.judge.me/api/v2/summary.json` answers 200,
 * `application/json`, 1,896 bytes (an unclaimed Statuspage decoy is ~127,700
 * bytes of HTML), and `page.name` is literally `"Judge.me"` with
 * `page.url: "https://status.judge.me"`.
 *
 * The page carries exactly five components, no groups:
 *
 *   - `Judge.me Product Reviews - Admin` — the dashboards/pages surface this
 *     app's REST API sits alongside. There is no component named "API"; this
 *     is the closest first-party proxy for it.
 *   - `Judge.me Product Reviews - Storefront widgets` — the public review
 *     widgets this app deliberately does not call (see `index.ts`), but
 *     `create-review` posts through the same public, unauthenticated path a
 *     storefront's own widget uses, so it is tracked too.
 *   - `AliExpress Review Importer`, `Shopify Admin`, `Shopify Storefront` —
 *     other Judge.me products/dependencies this app never touches. Excluded,
 *     so an AliExpress-importer incident never reports this app's REST
 *     surface as degraded.
 *
 * The verdict is the worst of the two components this app actually depends
 * on, not the page-level `status.indicator` (which folds in the other three).
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.judge.me/api/v2/summary.json";

/** Component names this app's surface actually depends on, keyed for the report. */
export const TRACKED_COMPONENTS: Record<string, string> = {
  admin: "Judge.me Product Reviews - Admin",
  "storefront-widgets": "Judge.me Product Reviews - Storefront widgets",
};

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
}

/** Statuspage's documented component vocabulary. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const service: HealthCheckDefinition = {
  key: "service",
  title: "Judge.me platform status",
  description:
    "Component status from status.judge.me, scoped to the Admin/API and Storefront widgets " +
    "components this app's actions depend on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.judge.me"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.judge\.me(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Judge.me's" };
    }

    const byName = new Map((body.components ?? []).filter((c) => c?.name).map((c) => [c.name, c]));
    const components: Record<string, HealthComponentReport> = {};
    let state: HealthState = "ok";

    for (const [key, name] of Object.entries(TRACKED_COMPONENTS)) {
      const component = byName.get(name);
      const cState = mapComponentStatus(component?.status);
      components[key] = cState === "ok"
        ? { state: cState, message: name }
        : { state: cState, message: `${name}: ${component?.status ?? "not found on status page"}` };
      if (RANK[cState] > RANK[state]) state = cState;
    }

    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;
    const notes: string[] = [];
    const affected = Object.values(components).filter((c) => c.state !== "ok");
    if (affected.length > 0) notes.push(affected.map((c) => c.message).join("; "));
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
