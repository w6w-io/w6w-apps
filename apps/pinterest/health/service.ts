/**
 * Is Pinterest up?
 *
 * ## The status page is real. Checked three ways on 2026-08-29
 *
 * Pinterest publishes at **`www.pintereststatus.com`**, an Atlassian
 * Statuspage. `status.pinterest.com` itself 308-redirects into
 * `pinterest.com`'s own product pages — not a status feed at all — so it is
 * deliberately not the URL used here.
 *
 * **(a) Not a catch-all.** `GET /api/v2/summary.json` answers `200` with
 * 16,400 bytes of real Statuspage JSON, `content-type: application/json;
 * charset=utf-8`.
 *
 * **(b) Does the page describe THIS product?** Yes:
 * `"page": {"id": "h8hwp7pfmmrz", "name": "Pinterest", "url":
 * "https://www.pintereststatus.com"}`.
 *
 * **(c) 41 components, mixing the consumer product and the developer API.**
 * Most of the page — Sign up and login, Home feed, Personal profile, Ads
 * Manager, Board create, Organic Pin creation — describes pinterest.com and
 * the Ads Manager UI, not this app's REST API surface at all. Exactly one
 * top-level group is the API: **"The Pinterest API"**, with eight named
 * children — Content and Core Endpoints, Conversions Endpoints, Campaign
 * Management Endpoints, Audience Targeting Endpoints, Analytics Endpoints,
 * Shopping Endpoints, Business Access and Billing Endpoints, and Trends
 * Endpoints — which is exactly the boards/pins/user_account/ad_accounts
 * surface this app calls. Reporting the other 33 (website login, home feed,
 * Ads Manager UI clicks) would report this app broken because Pinterest's own
 * *website* is having a bad day.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Pinterest is
 * SaaS-only — there is no self-hosted Pinterest — so an incident on
 * "The Pinterest API" component group is evidence about every connection this
 * app holds.
 *
 * `credential: "none"` is the default for `kind: "service"`, stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Pinterest access token.
 *
 * The verdict is the WORST of the eight API components, not the page-level
 * `status.indicator` — that field rolls up all 41 components, so an incident
 * on "Personal login" (the website, not the API) would otherwise report this
 * app degraded for a problem it cannot even observe.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://www.pintereststatus.com/api/v2/summary.json";

/** The one group, by name, whose children are this app's actual API surface. */
export const API_GROUP_NAME = "The Pinterest API";

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

/**
 * The API-relevant components: children of the group named {@link API_GROUP_NAME}.
 * Looked up by name rather than a hard-coded group id, so a Statuspage
 * re-index of ids (which has no bearing on the page's own structure) does not
 * silently empty this out.
 */
export function apiComponents(components: StatusComponent[]): StatusComponent[] {
  const apiGroup = components.find((c) => c.group === true && c.name === API_GROUP_NAME);
  if (!apiGroup?.id) return [];
  return components.filter((c) => c.group !== true && c.group_id === apiGroup.id);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Pinterest API status",
  description:
    'Component status from www.pintereststatus.com, filtered to "The Pinterest API" group — ' +
    "Content and Core, Conversions, Campaign Management, Audience Targeting, Analytics, " +
    "Shopping, Business Access and Billing, and Trends endpoints. The other 33 components on " +
    "that page describe the pinterest.com website and Ads Manager UI, not this app's API calls.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["www.pintereststatus.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)pintereststatus\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Pinterest's" };
    }

    const nodes = apiComponents(body.components ?? []);
    if (nodes.length === 0) {
      return { state: "unknown", message: `Status page had no "${API_GROUP_NAME}" components` };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const id = node.id ?? node.name ?? "unknown";
      const state = mapComponentStatus(node.status);
      components[id] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
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
