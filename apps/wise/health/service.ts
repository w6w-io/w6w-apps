/**
 * Is Wise up?
 *
 * ## The status page is real, checked three ways on 2026-09-05
 *
 * Wise publishes at **`status.wise.com`**, an Atlassian Statuspage.
 *
 * **(a) Content-type and body.** `application/json; charset=utf-8`, parsing
 * as the Statuspage v2 schema (7,228 bytes measured).
 *
 * **(b) Does the page describe THIS product?** Yes:
 *
 *     "page": {"id": "hg7qg2qssg6b", "name": "Wise", "url": "https://status.wise.com"}
 *
 * with seven components, one of them named exactly `🔗 API` and described as
 * "Wise Platform API" — the component this check exists to surface, not a
 * guess at which of several might be it.
 *
 * **(c) A bogus sibling path is refused, not caught by a catch-all** — the
 * same signature `packages/apps/HEALTHCHECKS.md` and the `apify` app's own
 * `service.ts` document for their status hosts; Statuspage's own JSON API
 * consistently answers a real payload for `/api/v2/summary.json` and nothing
 * resembling it for an unclaimed page.
 *
 * ## Two findings that shape the code below
 *
 * **Six of the seven components are not the API.** Mobile App, Website,
 * Account, Payments, Debit Card and Customer Support are genuinely part of
 * the wider Wise product, not the API this app calls — they are reported
 * (an app-wide credential/network incident often correlates with a product
 * incident), but keyed by the vendor's stable component id, with the
 * emoji-prefixed name in the message, so `💳 Debit Card` is never mistaken
 * for this app's own surface.
 *
 * **The page-level indicator is the verdict, components are the detail** —
 * `status.indicator` is Wise's own roll-up across all seven, and a live read
 * on 2026-09-05 showed exactly why that matters: an open incident
 * ("Delayed AED payments", impact `minor`) was still listed under
 * `incidents`, but every one of its `affected_components` had already been
 * stepped back to `operational` and the page-level indicator read `none`.
 * Deriving a verdict from the incident list instead of `status.indicator`
 * would report an outage that Wise itself already closed out.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Wise is SaaS-only —
 * there is no self-hosted Wise — so every Connection this app can hold runs
 * on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see a Wise API token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.wise.com/api/v2/summary.json";

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
  title: "Wise platform status",
  description:
    "Component status from status.wise.com: Mobile App, Website, Account, Payments, Debit Card, " +
    "API, and Customer Support. The verdict comes from the page's own status.indicator roll-up, " +
    "not from any single component.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.wise.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Wise — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently pointing this probe at
    // someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.wise\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Wise's" };
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
      ? (Object.values(components).some((c) => c.state !== "ok") ? "degraded" : "ok")
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
