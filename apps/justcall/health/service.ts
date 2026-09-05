/**
 * Is JustCall up?
 *
 * ## The status page is real. Checked three ways on 2026-09-05
 *
 * JustCall publishes at **`status.justcall.io`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes |
 *   | --------------------------------------- | ------- | ----- |
 *   | `/api/v2/summary.json`                  | 200     | 9,860 |
 *   | `/api/v2/definitely-not-real-zzz.json`  | **404** | **0** |
 *
 * **(b) Content-type and body.** `application/json`, parsing as the Statuspage
 * v2 schema, page id `vsvg4v1vptbk`.
 *
 * **(c) Does the page describe THIS product AND this API?** Yes, and better
 * than most: `"page": {"name": "JustCall", "url": "https://status.justcall.io"}`,
 * and among its 25 components is a component genuinely named **`Developer
 * APIs`** (id `zzgxzxgct6b9`) plus `Authorization` (`t0lrtcnljfkx`) and
 * `Webhooks` (`6jy51341gq2n`) — this is one of the few status pages in this pack
 * that names the REST API as its own component rather than folding it into a
 * generic "API" or leaving it out entirely. `justcall.statuspage.io/api/v2/summary.json`
 * answers with the identical `page.id`, confirming it is the same page under
 * its Statuspage-native host rather than a decoy.
 *
 * ## What shapes the code below
 *
 * The page mixes JustCall's own services with third-party dependencies it
 * groups under `Third-Party` (Filestack, OneSignal) and `Integrations`
 * (CRM/help-desk sync partners: HubSpot, Salesforce, Pipedrive, Active
 * Campaign). Those are reported — a `Third-Party` outage can still explain a
 * broken workflow step — but the verdict comes from `status.indicator`
 * (JustCall's own roll-up), never from the worst component, so a bad day at
 * one CRM integration partner does not report the whole platform down.
 * `group: true` rows are excluded from the component report because their
 * status only mirrors their children (`Calling`, `SMS & MMS services`,
 * `Integrations`, `Third-Party`), which would double-count every child.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. JustCall is SaaS-only
 * — there is no self-hosted JustCall — so every Connection this app can hold
 * runs on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly: it is the precondition for the `network` widening below — a
 * status host must never see a JustCall API key/secret pair.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.justcall.io/api/v2/summary.json";

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
  title: "JustCall platform status",
  description: "Component status from status.justcall.io, including its named Developer APIs, " +
    "Authorization and Webhooks components alongside the calling, SMS/MMS, dashboard, contact " +
    "sync and third-party dependency groups.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.justcall.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about JustCall — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.justcall\.io(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as JustCall's" };
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
