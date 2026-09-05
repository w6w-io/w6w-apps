/**
 * Is Ticket Tailor up?
 *
 * ## The status page is real, and specifically about this API — checked three ways on 2026-09-05
 *
 * Ticket Tailor publishes at **`status.tickettailor.com`**, an incident.io page
 * (not Atlassian Statuspage — confirmed by response headers: `server: Vercel`
 * and a `status-page-*.vercel.app` CSP entry) that exposes a Statuspage
 * v2-COMPATIBLE JSON API at `/api/v2/summary.json`.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No: `/api/v2/summary.json`
 * answers `200` (1,034 bytes of JSON), `/api/v2/definitely-not-real-zzz.json`
 * answers **404**.
 *
 * **(b) Content-type AND body.** `application/json`, parsing as
 * `{page, status: {indicator, description}, components: [...]}` — the same
 * shape this pack's `statuspage`/`apify` apps already parse.
 *
 * **(c) Does it name the right components?** Yes — four, one of them
 * literally named `"API"`:
 *
 *     "page": {"name": "Ticket Tailor", "url": "https://status.tickettailor.com/"}
 *     components: ["Check-in app", "Checkout", "Dashboard", "API"]
 *
 * All four are Ticket Tailor's own surfaces — none of the "this is someone
 * else's dependency" noise Apify's page carries — so nothing here needs the
 * per-component id-vs-vendor filtering that pattern requires.
 *
 * No redirect either: `curl -o /dev/null -w '%{num_redirects}'` against the
 * summary URL reports `0`.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see a Ticket Tailor API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.tickettailor.com/api/v2/summary.json";

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
  title: "Ticket Tailor platform status",
  description:
    "Component status from status.tickettailor.com: Check-in app, Checkout, Dashboard and API.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.tickettailor.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Ticket Tailor itself — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect/rebrand pointing this probe at someone
    // else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.tickettailor\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Ticket Tailor's",
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
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
