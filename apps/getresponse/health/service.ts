/**
 * Is GetResponse up?
 *
 * ## The status page is real. It was checked three ways on 2026-08-11
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 * `/api/v2/summary.json` returns 13,626 bytes of JSON;
 * `/api/v2/definitely-not-real-zzz.json` returns **404 with 0 bytes**.
 *
 * **(b) Content-type AND body.** `application/json; charset=utf-8`, parsing as
 * the Atlassian Statuspage v2 schema. Neither known unclaimed-host signature
 * matches: an unclaimed `*.statuspage.io` is ~127,700 B of HTML and an unclaimed
 * `*.instatus.com` ~216,800 B.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "ykjdtv1csj3l", "name": "GetResponse",
 *               "url": "https://status.getresponse.com" }
 *
 * and it publishes **42 components**, among them `API`, `Webhooks`, `Contacts
 * (+Import)`, `Forms and Popups`, `Webforms`, `Integration` and `Paid Ads` —
 * GetResponse's own subsystems, at a granularity that makes the component
 * breakdown genuinely useful rather than decorative.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. GetResponse is
 * SaaS-only — retail and MAX are both vendor-hosted, so there is no self-hosted
 * install for which this page would be irrelevant, and an incident here really
 * is evidence about every Connection. That is the opposite call from
 * `apps/metabase` and `apps/baserow`, and it is the difference between an
 * open-source product and this one.
 *
 * One nuance worth recording: the page does not separate retail from MAX, so a
 * MAX-only incident may not be visible here and a retail incident is reported to
 * MAX connections too. The per-connection credential check is what distinguishes
 * them in practice.
 *
 * `credential: "none"` is the precondition for the `network` widening below — a
 * third-party status host must never see the API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.getresponse.com/api/v2/summary.json";

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

/** Slugify a component name into a stable selector. */
export function componentId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "GetResponse platform status",
  description:
    "Component status from status.getresponse.com (Atlassian Statuspage), which publishes 42 " +
    "components including API, Webhooks and Contacts. It does not separate retail from MAX.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.getresponse.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about GetResponse — never `down`.
      return { state: "unknown", message: `Statuspage returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body) return { state: "unknown", message: "Statuspage returned an unreadable body" };

    // Guard against a future redirect or rebrand pointing this probe at somebody
    // else's page — a healthy, claimed page for a different product would
    // otherwise read as good news.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)getresponse\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as GetResponse's",
      };
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
