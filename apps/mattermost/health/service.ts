/**
 * Is Mattermost's own hosted platform up?
 *
 * ## The status page is real. It was checked three ways on 2026-08-11
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes | md5 (first 12) |
 *   | -------------------------------------- | ------- | ----- | -------------- |
 *   | `/api/v2/summary.json`                 | 200     | 1,850 | `83e120c03920` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —              |
 *   | `/history.atom`                        | 200     | 36,820| `4d75816fcc87` |
 *
 * Three different answers, and the nonsense path is refused outright.
 *
 * **(b) Content-type AND body.** `application/json; charset=utf-8`, parsing as
 * the Atlassian Statuspage v2 schema. Neither known unclaimed-host signature
 * matches: an unclaimed `*.statuspage.io` is ~127,700 B of HTML, an unclaimed
 * `*.instatus.com` ~216,800 B. This is 1,850 B of JSON.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "kjs79hlhbrpk", "name": "Mattermost",
 *               "url": "https://status.mattermost.com" }
 *
 * ## Why this check is `informational`, deliberately
 *
 * Read what the page actually covers. Its components are **Sign-Up**, **Customer
 * Portal**, **Cloud Workspaces**, **Calls** and **Community** — the vendor's
 * hosting business, its billing site, and its own community server. Mattermost
 * is open source and shipped as a Docker image and an omnibus package; a large
 * share of installs are somebody's own server, frequently on a private network,
 * and for those Connections every component on that page is irrelevant.
 *
 * This check is `scope: "app"`, so it cannot know which Connections are Cloud
 * and which are not. Left at the `degraded` default for `kind: "service"`, an
 * incident on Mattermost Cloud would pin every self-hosted tenant's App at
 * `degraded` — a plain untruth about their server. Same call `apps/metabase`,
 * `apps/baserow` and `apps/discourse` make.
 *
 * Nothing is lost. Every Connection has a strictly better signal for its own
 * server: the `instance` check probes that server's `/api/v4/system/ping`, per
 * Connection, at `degraded` severity.
 *
 * ## Posture
 *
 * `credential: "none"` — the default for `kind: "service"`, stated because it is
 * the precondition for the `network` widening below: a third-party status host
 * must never see the server's access token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.mattermost.com/api/v2/summary.json";

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatuspageSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatuspageComponent[];
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

/** Slugify a component name into a stable `component:<id>` selector. */
export function componentId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mattermost Cloud status",
  description:
    "Component status from status.mattermost.com (Atlassian Statuspage). Covers Mattermost's own " +
    "hosting, sign-up and community — a self-hosted server is unaffected, which is why this " +
    "check is informational and the per-connection `instance` check carries the weight.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.mattermost.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Mattermost — never `down`.
      return { state: "unknown", message: `Statuspage returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body) return { state: "unknown", message: "Statuspage returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // somebody else's status page — a healthy, claimed page belonging to an
    // entirely different product would otherwise read as good news.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)mattermost\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Mattermost's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Statuspage returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[componentId(node.name!)] = state === "ok"
        ? { state }
        : { state, message: node.status };
    }

    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) notes.push(`affected: ${affected.map(([id]) => id).join(", ")}`);
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
