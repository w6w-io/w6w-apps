import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * Is Pendo up — and in which region?
 *
 * `status.pendo.io` is an Atlassian Statuspage, read live 2026-09-01. Its
 * components are grouped per region (`"US environment (app.pendo.io)"`,
 * `"EU environment (app.eu.pendo.io)"`, …) rather than rolled into one
 * indicator, which matches the API itself: each region is a fully separate
 * deployment (see `lib/client.ts`).
 *
 * Within each region there are components for `Pendo UI`, `NPS`, `Guide
 * Designer`, `Resource Center`, `Webhooks`, `MCP` and more that this app
 * never touches. Only three matter to what this app actually calls:
 *
 * - **API** — everything under `/api/v1/*` (every read action, metadata,
 *   guides, reports, aggregation, bulk deletion).
 * - **Analytics - Data Collection** — the ingest side, i.e. `track-event`.
 * - **Analytics - Data Processing** — what `run-aggregation` and
 *   `report-results` actually query.
 *
 * This is app-scoped: it cannot know which region(s) any given Connection
 * uses, so it reports all five and names which are affected rather than
 * guessing one. `severity: "informational"` for the same reason — an outage
 * in a region no Connection here uses would otherwise wrongly degrade every
 * Connection's rollup.
 */
export const STATUS_URL = "https://status.pendo.io/api/v2/summary.json";

/** The three components this app's actions actually depend on. */
const RELEVANT_COMPONENTS = /^(api|analytics - data collection|analytics - data processing)$/i;

/** Region code from a Statuspage group name, e.g. `"US1 environment (…)"` -> `"US1"`. */
const REGION_FROM_GROUP = /^(US1|US|EU|JPN|AU)\s+environment/i;

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatuspageSummary {
  page?: { name?: string };
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
}

/** Atlassian's component vocabulary. */
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

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Pendo service status",
  description:
    "Pendo's per-region status page, narrowed to the API, ingest, and query components this " +
    "app's actions depend on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.pendo.io"] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    if (!res.ok) {
      await res.body?.cancel();
      // A broken status page says nothing about Pendo — never `down`.
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.components) {
      return { state: "unknown", message: "the status page did not return its components" };
    }
    if (!/pendo/i.test(body.page?.name ?? "")) {
      return { state: "unknown", message: "the status page no longer self-identifies as Pendo's" };
    }

    const groups = new Map<string, string>();
    for (const c of body.components) {
      if (c.group === true && c.id && c.name) groups.set(c.id, c.name);
    }

    const relevant = body.components.filter((c) =>
      c.group !== true && c.name && RELEVANT_COMPONENTS.test(c.name) &&
      c.group_id && REGION_FROM_GROUP.test(groups.get(c.group_id) ?? "")
    );

    if (relevant.length === 0) {
      return { state: "unknown", message: "none of the tracked components were found on the page" };
    }

    const report: Record<string, HealthComponentReport> = {};
    for (const c of relevant) {
      const region = (groups.get(c.group_id!) ?? "").match(REGION_FROM_GROUP)?.[1] ?? "?";
      const key = `${region.toLowerCase()}-${slug(c.name!)}`;
      const state = mapComponentStatus(c.status);
      report[key] = state === "ok" ? { state } : { state, message: c.status };
    }

    const affected = relevant.filter((c) => mapComponentStatus(c.status) !== "ok");
    if (affected.length === 0) {
      return {
        state: "ok",
        message: body.status?.description ?? "all tracked components operational",
        components: report,
        ttlSeconds: 300,
      };
    }

    const worst = worstHealthState(affected.map((c) => mapComponentStatus(c.status)));
    const names = affected.map((c) => {
      const region = (groups.get(c.group_id!) ?? "").match(REGION_FROM_GROUP)?.[1] ?? "?";
      return `${region} ${c.name} (${c.status})`;
    }).join(", ");

    return {
      // Capped: this hook cannot know which region(s) a given Connection uses,
      // so a single region's outage never reports the whole App as fully down.
      state: worst === "down" ? "degraded" : worst,
      message: `${names} — a Connection is only affected if it uses one of these regions`,
      components: report,
      ttlSeconds: 300,
    };
  },
};

export default service;
