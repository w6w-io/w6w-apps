/**
 * Is Datadog up — **at this Connection's site**?
 *
 * ## Datadog publishes one status page per site, and each speaks only for itself
 *
 * This is the finding that shapes the whole check. `status.datadoghq.com` is not
 * "Datadog's status page"; it is **US1's**. Measured 2026-08-11, one request per
 * host:
 *
 *   | Site    | Status host                  | `page.name`        | Components |
 *   | ------- | ---------------------------- | ------------------ | ---------- |
 *   | US1     | `status.datadoghq.com`       | `Datadog US1`      | 39         |
 *   | US3     | `status.us3.datadoghq.com`   | `Datadog US3`      | 38         |
 *   | US5     | `status.us5.datadoghq.com`   | `Datadog US5`      | 38         |
 *   | EU1     | `status.datadoghq.eu`        | `Datadog EU`       | 38         |
 *   | AP1     | `status.ap1.datadoghq.com`   | `Datadog AP1`      | 38         |
 *   | AP2     | `status.ap2.datadoghq.com`   | `Datadog AP2`      | 38         |
 *   | UK1     | `status.uk1.datadoghq.com`   | **404**            | —          |
 *   | US1-FED | `status.ddog-gov.com`        | `Datadog Govcloud` | 39         |
 *   | US2-FED | `status.us2.ddog-gov.com`    | `Datadog US2 Fed`  | 39         |
 *
 * So a `credential: "none"`, `scope: "app"` check — the usual shape for a vendor
 * status probe, and what every other app in this pack uses — would report US1's
 * weather to an EU1 Connection. That is why this one is `scope: "connection"`
 * with the `context` posture: it needs the Connection to know *which* page to
 * read, and no credential to interpret the answer.
 *
 * ## UK1 has no status page, and this check says so rather than guessing
 *
 * `status.uk1.datadoghq.com/api/v2/summary.json` answers
 * `404 {"errors":["Not found"]}` — Datadog's *own* API error envelope, not a
 * Statuspage 404, so the hostname resolves into Datadog's infrastructure with no
 * status page mapped behind it. A UK1 Connection therefore reports `unknown`
 * here, permanently, with that reason stated. It is not a healthy verdict and it
 * is not pretended to be one; the `api` check is the live signal for UK1, and it
 * works on every site.
 *
 * ## The page is real, checked three ways on 2026-08-11
 *
 * **(a) Not a catch-all.** `/api/v2/summary.json` → 200, 13,036 B;
 * `/api/v2/status.json` → 200, 234 B; `/api/v2/definitely-not-real-zzz.json` →
 * **404, 0 B**. Three different answers, nonsense refused.
 *
 * **(b) Content-type and body.** `application/json`, parsing as the Statuspage
 * v2 schema. Neither unclaimed-host signature matches: an unclaimed
 * `*.statuspage.io` is ~127,700 B of HTML and an unclaimed `*.instatus.com`
 * ~216,800 B. These are 12–13 kB of JSON.
 *
 * **(c) It describes this product.** `page.name` is `Datadog <site>` and
 * `page.url` is the host requested.
 *
 * ## But it is NOT a statement about the API
 *
 * Every one of the eight pages carries product components — APM, Log Management,
 * Monitors, Metrics and Infra Monitoring, Synthetics, RUM, Workflow Automation,
 * `www.datadoghq.com`, … — and, measured across all eight, **not one component
 * whose name mentions the API**. A green page does not mean `api.<site>` is
 * answering, and this check must not be read as saying so. That question belongs
 * to `health/api.ts`, which asks `api.<site>` directly.
 *
 * What this check *is* good for is the other half: a `major_outage` on Monitors
 * really does explain why `monitor-list` is failing, and no reachability probe
 * would ever tell you that.
 *
 * `credential: "context"` is stated explicitly because it is the precondition
 * for the `network` widening below — a status host must never see a Datadog key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { type DatadogSiteId, siteFromConnection } from "../lib/sites.ts";

/**
 * Site → Statuspage host.
 *
 * Deliberately here and not in `lib/sites.ts`: the audit tool derives an app's
 * egress set from the URL literals in `actions/`, `auth/` and `lib/`, and a
 * status host must live in this check's own `network.allow`, never in the app's.
 * `undefined` is a declared absence, not an oversight.
 */
export const STATUS_HOSTS: Record<DatadogSiteId, string | undefined> = {
  us1: "status.datadoghq.com",
  us3: "status.us3.datadoghq.com",
  us5: "status.us5.datadoghq.com",
  eu1: "status.datadoghq.eu",
  ap1: "status.ap1.datadoghq.com",
  ap2: "status.ap2.datadoghq.com",
  uk1: undefined,
  gov: "status.ddog-gov.com",
  us2_gov: "status.us2.ddog-gov.com",
};

/** Every host this check may reach — exactly the eight that exist. */
export const STATUS_ALLOW: string[] = Object.values(STATUS_HOSTS).filter((h): h is string => !!h);

export function statusUrl(host: string): string {
  return `https://${host}/api/v2/summary.json`;
}

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
  status?: { indicator?: string; description?: string };
}

/**
 * Statuspage's documented component vocabulary: `operational`,
 * `degraded_performance`, `partial_outage`, `major_outage`,
 * `under_maintenance`.
 */
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

/** The page-level roll-up: `none`, `minor`, `major`, `critical`, `maintenance`. */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/**
 * Key a component by Statuspage's stable id, falling back to a slug of the name.
 *
 * The id survives renames and is what the page's own incident records reference.
 * The fallback exists only so a future page without ids still reports something
 * rather than silently dropping rows.
 */
export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    return `${
      component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Datadog site status",
  description:
    "Product component status from this connection's own Datadog status page — one page per " +
    "site, so an EU1 connection reads status.datadoghq.eu and never US1's. Covers APM, Log " +
    "Management, Monitors, Metrics and Infra Monitoring, Synthetics, RUM and the rest of the " +
    "product surface. It does NOT cover the REST API: no Datadog status page publishes an API " +
    "component. See the `api` check for that.",
  kind: "service",
  // Not the `service` default of `app`: the page to read is a property of the
  // connection's site, and one shared app-scoped result would be wrong for
  // every connection not on US1.
  scope: "connection",
  credential: "context",
  covers: ["*"],
  network: { allow: STATUS_ALLOW },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const site = siteFromConnection(ctx.connection);
    const host = STATUS_HOSTS[site.id];
    if (!host) {
      return {
        state: "unknown",
        message: `Datadog publishes no status page for ${site.label}: ` +
          "status.uk1.datadoghq.com/api/v2/summary.json answers 404 with Datadog's own error " +
          "envelope (measured 2026-08-11). The `api` check is the live signal for this site.",
      };
    }

    const url = statusUrl(host);
    const res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about Datadog — never `down`.
      return { state: "unknown", message: `${host} returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: `${host} returned an unreadable body` };

    // Guard against a redirect or rebrand silently pointing this probe at
    // someone else's page — a healthy, claimed status page for a different
    // product is the failure mode a 200 cannot catch.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !new RegExp(`(^|//|\\.)${host.replace(/\./g, "\\.")}(/|$)`, "i").test(pageUrl)) {
      return {
        state: "unknown",
        message: `${host} no longer self-identifies as ${site.label}'s status page`,
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: `${host} returned no components` };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const [index, node] of nodes.entries()) {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // Statuspage id, so without it a reader cannot tell which product this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [`${body.page?.name ?? site.label}`];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return { state, message: notes.join("; "), components, ttlSeconds: 60 };
  },
};

export default service;
