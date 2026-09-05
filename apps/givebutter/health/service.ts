/**
 * Is Givebutter up?
 *
 * ## Two "Givebutter status" hosts exist; only one is a real, claimed feed
 *
 * **`status.givebutter.com`** looks right — it resolves, serves a page that
 * reads as an Instatus-style status site, and even answers JSON at
 * `/summary.json`. But that JSON is a fixed 82-byte stub:
 *
 *     {"page":{"name":"Givebutter","url":"https://status.givebutter.com","status":"UP"}}
 *
 * — no components, no incidents, no timestamp, identical on every request.
 * That is not a live status feed; it reads as a static health-check
 * placeholder rather than Instatus's real per-component summary shape (compare
 * `apps/airtop`, a genuine Instatus page, which returns component arrays).
 * `/api/v2/status.json` and `/api/v2/summary.json` on this host both 404.
 *
 * **`givebutter.statuspage.io`** is the real one: a fully-configured Atlassian
 * Statuspage claimed by Givebutter (`page.name: "Givebutter"`), with a
 * component literally named **`API`** — created 2020-12-01, distinct from the
 * `Dashboard` and `Campaigns` components (Givebutter's public-facing web
 * surfaces, which can go down independently of the API). This app watches the
 * `API` component specifically rather than the page-level roll-up, so a
 * `Dashboard` incident does not report this app's own dependency as degraded.
 *
 * `status.givebutter.com` is a real, reachable host — just not a real feed —
 * so it is named here as a rejected candidate rather than left silently
 * unconsidered.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Givebutter is
 * SaaS-only — there is no self-hosted deployment — so every Connection this
 * app can hold runs on exactly the infrastructure this page describes.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://givebutter.statuspage.io/api/v2/summary.json";

/** The `API` component's id on Givebutter's Statuspage page — stable across renames. */
export const API_COMPONENT_ID = "2nsth88k4wh0";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Givebutter API status",
  description:
    "The API component on status.givebutter.com's real feed (givebutter.statuspage.io) — not " +
    "the Dashboard/Campaigns web components, which can degrade independently of the API.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["givebutter.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Givebutter — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a redirect or rebrand silently pointing this probe at a
    // page that no longer describes Givebutter.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)givebutter\.statuspage\.io(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Givebutter's" };
    }

    const api = (body.components ?? []).find((c) => c.id === API_COMPONENT_ID);
    if (!api) {
      return { state: "unknown", message: "Status page no longer lists the API component" };
    }

    const state = mapComponentStatus(api.status);
    const openIncidents = body.incidents?.length ?? 0;
    const notes: string[] = [];
    if (state !== "ok") notes.push(`API: ${api.status}`);
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: { [API_COMPONENT_ID]: { state, message: "API" } },
      ttlSeconds: 60,
    };
  },
};

export default service;
