/**
 * Is Apify up?
 *
 * ## The status page is real. It was checked three ways on 2026-08-11
 *
 * Apify publishes at **`status.apify.com`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes  | md5 (first 12) |
 *   | -------------------------------------- | ------- | ------ | -------------- |
 *   | `/api/v2/summary.json`                 | 200     | 11,465 | `39aa0c321a4e` |
 *   | `/api/v2/status.json`                  | 200     | 221    | `5636859aa4af` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0**  | —              |
 *
 * Three different answers, and the nonsense path is refused outright.
 *
 * **(b) Content-type AND body.** `application/json; charset=utf-8`, parsing as
 * the Statuspage v2 schema. Neither known unclaimed-host signature matches: an
 * unclaimed `*.statuspage.io` is ~127,700 B of HTML, an unclaimed
 * `*.instatus.com` is ~216,800 B. This is 11,465 B of JSON.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "j23nkrf8p8p8", "name": "Apify",
 *               "url": "https://status.apify.com" }
 *
 * and its 29 components are Apify's own — `API (api.apify.com)`,
 * `Console (console.apify.com)`, `Actors`, `Scheduler`, `Webhooks`,
 * `MCP server (mcp.apify.com)`, plus `Storage` (Dataset, Key-value store,
 * Request queue) and `Proxy` (Datacenter, Residential, SERP) groups.
 *
 * ## Two findings that shape the code below
 *
 * **Eleven of the twenty-nine components are not Apify.** The `External services`
 * group carries AWS EC2/S3/SQS/ELB/ECR/EKS/DynamoDB/ElastiCache, Stripe (API),
 * Mailgun (API) and npm. They are genuinely upstream of Apify, so they
 * are reported, but keying them by the vendor's component id keeps
 * `Mailgun (API)` from ever being mistaken for an Apify service by a reader
 * skimming component names.
 *
 * **The page-level indicator is the verdict, components are the detail.**
 * `status.indicator` is Apify's own roll-up across all twenty-nine, and it is
 * the field to trust; deriving a verdict from the component list instead would
 * report Apify down because npm is having a bad day.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Apify is SaaS-only —
 * there is no self-hosted Apify — so every Connection this app can hold runs on
 * exactly the infrastructure this page describes, and an incident here really is
 * evidence about every tenant.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see an Apify API token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.apify.com/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
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
 * Key a component by the vendor's id, falling back to a slug of the name.
 *
 * The id is stable across renames and is what the page's own incident records
 * reference. The fallback exists only so a future page that drops ids still
 * reports something rather than silently dropping rows.
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
  title: "Apify platform status",
  description:
    "Component status from status.apify.com. Covers the API, Console, Actors, Scheduler, " +
    "Webhooks, the three storage services and the three proxy services, plus the external " +
    "services (AWS, Stripe, Mailgun, npm) Apify itself depends on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.apify.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Apify — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.apify\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Apify's" };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; reporting them would double-count every storage and proxy
    // service.
    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which component this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
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
