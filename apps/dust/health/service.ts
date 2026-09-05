/**
 * Is Dust up?
 *
 * ## The status page is real, checked three ways on 2026-09-05
 *
 * Dust publishes at **`status.dust.tt`**, an Atlassian Statuspage.
 *
 * **(a) Not a catch-all.** `status.dust.tt/api/v2/summary.json` answers 200
 * with 5,700 bytes of structured JSON — not the ~127,700-byte HTML shell an
 * unclaimed `*.statuspage.io` page serves.
 *
 * **(b) Content matches.** `page.name` is `"Dust"`, `page.url` is
 * `https://status.dust.tt`.
 *
 * **(c) The components are this product's own**, not a generic template:
 * `API` and `Dust App Platform` (grouped "Dust Developer Platform"),
 * `Conversations` / `Data Sources` / four named third-party `Connection - *`
 * rows (grouped "Dust Application"), and `us-central1` / `europe-west1`
 * (grouped "Regions") — the same two regions the OpenAPI document's two
 * `servers` name.
 *
 * ## What this check reports, and what it deliberately drops
 *
 * This app calls the REST API (`API`), the agent/conversation surface
 * (`Conversations`), and data-source search (`Data Sources`) — plus both
 * regional components, since which one matters depends on the *Connection*
 * this app-scoped check cannot see. Dropped: `Dust App Platform` (the legacy,
 * now-deprecated Dust Apps surface this app does not implement — see
 * `docs.dust.tt/docs/developer-platform/legacy-dust-apps`, "Dust Apps are
 * deprecated"), the four `Connection - *` rows (third-party connector sync,
 * not this REST API), `Dust Slackbot` / `Chrome Extension` (different
 * products), and `Testing Component` (its own name says what it is).
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly: a status host must never see a Dust API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.dust.tt/api/v2/summary.json";

/** Vendor component name -> the key this check reports it under. */
const RELEVANT: Record<string, string> = {
  "API": "api",
  "Conversations": "conversations",
  "Data Sources": "data-sources",
  "us-central1": "us-central1",
  "europe-west1": "europe-west1",
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
  incidents?: Array<{ name?: string }>;
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Dust platform status",
  description:
    "Component status from status.dust.tt, scoped to the REST API, Conversations and Data " +
    "Sources components plus both regions. Excludes the deprecated Dust App Platform and the " +
    "third-party connector/Slackbot/extension rows, which this app does not call.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.dust.tt"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Dust — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.dust\.tt(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Dust's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && RELEVANT[c.name]);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned none of the expected components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const key = RELEVANT[node.name!];
      const state = mapComponentStatus(node.status);
      components[key] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const indicator = body.status?.indicator;
    const state = mapIndicator(indicator);

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
