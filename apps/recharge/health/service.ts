/**
 * Is Recharge up?
 *
 * ## The status page is real, verified 2026-09-05
 *
 * `status.getrecharge.com` is an Atlassian Statuspage, confirmed three ways:
 *
 * **(a) It answers real, distinct content.** `/api/v2/summary.json` (6,075
 * bytes) and `/api/v2/status.json` (236 bytes) both answer `200` with JSON
 * that decodes as the Statuspage v2 schema and states
 * `"page":{"id":"p5c6ktq11259","name":"Recharge","url":"https://status.getrecharge.com"}`.
 *
 * **(b) The obvious decoys redirect here or elsewhere.**
 * `status.rechargepayments.com/api/v2/summary.json` redirects to this exact
 * URL; `getrecharge.statuspage.io` and `rechargepayments.statuspage.io` both
 * redirect to `statuspage.io`'s own marketing page (the unclaimed-host
 * signature), ruling out the tempting default-subdomain guesses.
 *
 * **(c) It names a real "Recharge API" component**, id `w0w91qvm66xy`, distinct
 * from the platform-integration components (`Shopify Admin`, `Shopify API &
 * Mobile`, `BigCommerce`, …) the same page also tracks — those describe the
 * ecommerce platforms Recharge integrates with, not Recharge's own API, so
 * they are read but never reported as a Recharge outage on their own.
 *
 * ## Component-first, not the page-level indicator
 *
 * The page mixes Recharge's own services with the Shopify/BigCommerce
 * components above, so `status.indicator` (the page-wide roll-up) is *not*
 * used as the verdict — a Shopify-side incident would report every Recharge
 * connection down, which is not this app's failure mode. Instead the check
 * reads the "Recharge API" component by id and reports on that alone, with
 * the wider list surfaced in `components`/`message` for context.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`: Recharge is SaaS-only
 * (there is no self-hosted Recharge), so every Connection this app can hold
 * runs on the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see a Recharge API token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.getrecharge.com/api/v2/summary.json";

/** The one component this check reports on — Recharge's own API, not its ecommerce integrations. */
export const API_COMPONENT_ID = "w0w91qvm66xy";
export const API_COMPONENT_NAME = "Recharge API";

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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Recharge platform status",
  description:
    "The 'Recharge API' component from status.getrecharge.com. The page also tracks Shopify " +
    "and BigCommerce components Recharge integrates with — those are surfaced for context but " +
    "never drive this check's own verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.getrecharge.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Recharge — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.getrecharge\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Recharge's",
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const apiComponent = nodes.find((c) => c.id === API_COMPONENT_ID) ??
      nodes.find((c) => c.name === API_COMPONENT_NAME);
    if (!apiComponent) {
      return {
        state: "unknown",
        message: `Status page no longer lists a "${API_COMPONENT_NAME}" component`,
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const state = mapComponentStatus(apiComponent.status);
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (state !== "ok") notes.push(`${API_COMPONENT_NAME}: ${apiComponent.status}`);
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
