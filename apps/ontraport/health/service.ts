/**
 * Is Ontraport up?
 *
 * ## The status page is real, but the obvious host is a decoy
 *
 * `status.ontraport.com` looks like a claimed Statuspage host, but every path
 * under it (`/api/v2/summary.json`, `/api/v2/status.json`, `/history.atom`)
 * answers `302` to `https://www.statuspage.io` — Statuspage's own generic
 * marketing redirect, not Ontraport's page. Measured on 2026-09-05.
 *
 * The real page is **`ontraport.statuspage.io`**, found by checking Ontraport
 * app is stating that this page is itself:
 *
 *   `GET https://ontraport.statuspage.io/api/v2/summary.json` → `200`,
 *   `application/json`, 6,921 bytes, `page.name: "Ontraport"`,
 *   `page.url: "http://ontraportstatus.com"` — Ontraport's own vanity domain
 *   for the same Statuspage instance.
 *
 * Its 17 components span far more than this app's surface — `Landing Pages`,
 * `Payment Forms`, `Hosted Wordpress Sites`, `DNS`, `Automation`,
 * `Ontraport Login` — most of which this app never calls into. Rolling up the
 * PAGE-level indicator (as several sibling apps do for a single-surface SaaS)
 * would report the REST API down because, say, hosted WordPress sites are
 * having a bad day. So this check keys on the one component actually named
 * for it — **`API`** (id `09fyxy97d1tc`, description "Ontraport API
 * Services") — and reports the rest for context only.
 *
 * Severity is left at the `degraded` default: there is no self-hosted
 * Ontraport, so an API outage here really is evidence about every Connection
 * this app can hold.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://ontraport.statuspage.io/api/v2/summary.json";

/** The one component this app's surface actually depends on. */
export const API_COMPONENT_ID = "09fyxy97d1tc";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Ontraport platform status",
  description: "The API component from ontraport.statuspage.io, scoped away from the page's " +
    "many non-API components (Landing Pages, Payment Forms, Hosted Wordpress Sites, DNS, ...).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["ontraport.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Ontraport itself — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/ontraportstatus\.com/i.test(pageUrl) && body.page?.name !== "Ontraport") {
      return { state: "unknown", message: "status page no longer self-identifies as Ontraport's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    const apiComponent = nodes.find((c) => c.id === API_COMPONENT_ID);
    if (!apiComponent) {
      return { state: "unknown", message: "Status page no longer lists an API component" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const key = node.id ?? node.name!;
      const state = mapComponentStatus(node.status);
      components[key] = state === "ok" ? { state, message: node.name } : {
        state,
        message: `${node.name}: ${node.status}`,
      };
    }

    const state = mapComponentStatus(apiComponent.status);
    const affected = nodes.filter((n) =>
      n.id !== API_COMPONENT_ID && mapComponentStatus(n.status) !== "ok"
    );
    const notes: string[] = [];
    if (state !== "ok") notes.push(`API: ${apiComponent.status}`);
    if (affected.length > 0) {
      notes.push(
        `other components affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`,
      );
    }
    const openIncidents = body.incidents?.length ?? 0;
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
