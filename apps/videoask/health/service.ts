/**
 * Is VideoAsk up?
 *
 * ## The status page is real, checked three ways on 2026-08-30
 *
 * VideoAsk publishes at **`status.videoask.com`**, an Atlassian Statuspage.
 *
 * **(a) It answers real JSON, not a decoy shell.**
 * `GET https://status.videoask.com/api/v2/summary.json` returned `200`,
 * `application/json; charset=utf-8`, 4,730 bytes, parsing as the Statuspage v2
 * schema — not the ~127,700-byte HTML an unclaimed `*.statuspage.io` serves.
 *
 * **(b) The page names VideoAsk.**
 * `page.name` is `"VideoAsk"` and `page.url` is
 * `"https://status.videoask.com"`.
 *
 * **(c) VideoAsk's own app links to it.** The `www.videoask.com` 404 page's
 * "System status" button points at exactly this host — confirmed by fetching
 * that page and reading the link, not by trusting the vendor's word for it.
 *
 * ## What the 14 components are
 *
 * `API`, `Website, Web App and videoasks`, `Auth0 Authentication API` and
 * `Subscriptions` are VideoAsk's own services — the first three are exactly
 * the surface this app depends on (the REST API and the Auth0-backed OAuth
 * flow). The other ten are AWS regional dependencies
 * (`route53`, `lambda-us-east-1`, `mediaconvert-us-east-1`,
 * `ecs-us-east-1`, `rds-us-east-1`, `elasticache-us-east-1`,
 * `ec2-us-east-1`, `route53-us-east-1`, `cloudwatch-us-east-1`) plus
 * `iOS App`, which this app cannot exercise from a REST client. They are
 * reported (a genuine upstream dependency), but keyed by the vendor's
 * component id so a reader skimming names never mistakes `AWS ec2-us-east-1`
 * for a VideoAsk-authored outage.
 *
 * ## The page-level indicator is the verdict; components are the detail
 *
 * `status.indicator` is VideoAsk's own roll-up across all 14 components, and
 * is the field trusted for the check's overall state — deriving a verdict
 * from the component list instead would report VideoAsk down because one AWS
 * region is having a bad day.
 *
 * `credential: "none"` (the default for `kind: "service"`) is stated
 * explicitly: it is the precondition for the `network` widening below — a
 * status host must never see a VideoAsk access token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.videoask.com/api/v2/summary.json";

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

/** Key a component by the vendor's id, falling back to a slug of the name. */
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
  title: "VideoAsk platform status",
  description:
    "Component status from status.videoask.com: API, Website/Web App, Auth0 Authentication API " +
    "and Subscriptions, plus the AWS regional and iOS App dependencies VideoAsk itself reports.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.videoask.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.videoask\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as VideoAsk's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
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
