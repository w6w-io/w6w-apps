/**
 * Is Dialpad up?
 *
 * ## The status page is real. It was checked three ways on 2026-08-29
 *
 * Dialpad publishes at **`status.dialpad.com`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes |
 *   | --------------------------------------- | ------- | ----- |
 *   | `/api/v2/summary.json`                  | 200     | 6,538 |
 *   | `/api/v2/status.json`                   | 200     | 231   |
 *   | `/api/v2/definitely-not-real-zzz.json`  | **404** | **0** |
 *
 * Three different answers, and the nonsense path is refused outright.
 *
 * **(b) Content-type and body.** `application/json; charset=utf-8`, parsing as
 * the Statuspage v2 schema. 6,538 B of structured JSON, not the ~127,700 B of
 * HTML an unclaimed `*.statuspage.io` page serves.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "80trk830s0hg", "name": "Dialpad",
 *               "url": "https://status.dialpad.com" }
 *
 * and its 18 components are Dialpad's own — `Telephony Infrastructure: Inbound
 * Calls`, `Telephony Infrastructure: Outbound Calls`, `Carrier Networks: Local
 * Numbers`, `Carrier Networks: Toll-Free Numbers`, `Carrier Networks:
 * Messaging`, `Application`, `Contact Center`, `Omnichannel`, `Meetings`,
 * `Analytics`, `API Platform`, `Integrations`, `Messaging`, `Website`,
 * `Dialpad Ai`, `Google Cloud Platform`, `Ai Agent`, `Workforce Management`.
 *
 * ## No component groups, unlike some vendors on this page's own platform
 *
 * Every component in this page's `components` array has `group: false` and
 * `group_id: null` — it is a flat list, not the grouped/nested shape some other
 * Statuspage instances use (compare Apify's, which groups Storage and Proxy).
 * The mapping below still checks for `group: true` defensively, in case
 * Dialpad restructures the page later, but nothing in the current page needs
 * that filter to avoid double-counting.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Dialpad is SaaS-only —
 * there is no self-hosted Dialpad — so every Connection this app can hold runs
 * on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Dialpad API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.dialpad.com/api/v2/summary.json";

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
  title: "Dialpad platform status",
  description:
    "Component status from status.dialpad.com. Covers telephony infrastructure, carrier " +
    "networks, the Application, Contact Center, Omnichannel, Meetings, Analytics, the API " +
    "Platform, Integrations, Messaging, the marketing Website, Dialpad Ai, the underlying Google " +
    "Cloud Platform, the Ai Agent and Workforce Management.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.dialpad.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Dialpad — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.dialpad\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Dialpad's" };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children. Defensive only — see the module doc: this page has none today.
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
