/**
 * Is Connecteam up?
 *
 * ## The status page is real. Checked three ways on 2026-08-29
 *
 * Connecteam publishes at **`connecteam.statuspage.io`**, an Atlassian
 * Statuspage instance. `status.connecteam.com` and `connecteamstatus.com`
 * both fail to resolve at all (`curl` exit code, not an HTTP error), so this
 * is not a case of picking between several plausible hosts.
 *
 * **(a) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "rm6hp617s26d", "name": "Connecteam",
 *               "url": "https://connecteam.statuspage.io" }
 *
 * and its 17 components are named after Connecteam's own feature set —
 * `Platform`, `Job Scheduler`, `Time Clock`, `Task Management`, `Forms`,
 * `Chat`, `Documents`, `Courses`, `Knowledge Base`, `Recognition`, `Rewards`,
 * `Login`, `Notifications`, `Activity Log`, `Updates`, `Events`,
 * `Customize` — not a generic unclaimed-page placeholder set.
 *
 * **(b) Component vocabulary matches this app's surface.** `Job Scheduler`,
 * `Time Clock`, `Task Management` and `Forms` map directly onto this app's
 * own action groups, which is the strongest evidence the page and the API
 * are the same product rather than a stale or unrelated instance.
 *
 * **(c) No groups.** Every component in the summary carries `"group": false`
 * — there is no group/child hierarchy to collapse here, unlike pages that
 * mix per-region or per-service groups into the same list.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Connecteam is
 * SaaS-only — there is no self-hosted deployment — so an incident on this
 * page really is evidence about every Connection this app can hold.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see a company's API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://connecteam.statuspage.io/api/v2/summary.json";

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
  title: "Connecteam platform status",
  description:
    "Component status from connecteam.statuspage.io: Platform, Job Scheduler, Time Clock, " +
    "Task Management, Forms, Chat and the rest of Connecteam's own status page.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["connecteam.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Connecteam — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently pointing this probe at a
    // different claimed page — the failure mode where a healthy, claimed
    // status page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)connecteam\.statuspage\.io(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Connecteam's" };
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
