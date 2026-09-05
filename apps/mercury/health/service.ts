/**
 * Is Mercury up?
 *
 * ## The status page is real, checked three ways on 2026-09-05
 *
 * Mercury publishes at **`status.mercury.com`**, incident.io-hosted (not a
 * classic Atlassian Statuspage — the page's own HTML references
 * `incident-io-status-page-logos`), but its `/api/v2/summary.json` route
 * answers the same Statuspage-v2-compatible JSON shape (`page`, `status`,
 * `components`) most vendors in this pack publish.
 *
 * **(a) Content-type and body.** `application/json`, parsing as that schema.
 *
 * **(b) Does the page describe THIS product?** Yes:
 *
 *     "page": {"id": "01KY0BM0EDZQQK0BXQ6XWYAX8A", "name": "Mercury ", "url": "https://status.mercury.com/"}
 *
 * with 11 components, one named exactly **"Integrations & API"** and
 * described "QuickBooks, Xero, and NetSuite sync; bank feeds; receipt
 * capture, and the Mercury public API and webhooks" — the component this
 * check exists to surface. A decoy `mercury.statuspage.io` also exists but
 * answers `401 "Your page is inactive"` (unclaimed), confirming
 * `status.mercury.com` is the real one, not a look-alike.
 *
 * **(c) The vendor's OWN decoy is refused, not caught by a catch-all** — see
 * above; the unclaimed `mercury.statuspage.io` behaves exactly as an
 * unclaimed Statuspage page should, ruling out a shared catch-all response.
 *
 * ## Two findings that shape the code below
 *
 * **This page's JSON omits `incidents`/`scheduled_maintenances` entirely**
 * when there are none, rather than the empty arrays a classic Statuspage
 * instance always includes — both keys were absent (not `null`, not `[]`)
 * from a live all-clear response measured 2026-09-05. Every read below
 * defaults with `?? []` rather than assuming the key exists.
 *
 * **Ten of the eleven components are not the API.** Support, Bill Pay &
 * Invoicing, Money Movement, Account Management, Account Access, Cards,
 * Mercury Treasury, Account Opening, Check Deposits, and Mercury Personal are
 * genuinely part of the wider Mercury product, not the API this app calls —
 * "Money Movement" and "Cards" in particular cover the same underlying rails
 * this app's `transaction-send`/`transfer-create`/`card-*` actions ride on,
 * so they are reported too (an app-wide credential/network incident often
 * correlates with a product incident), keyed by the vendor's stable
 * component id with the plain name in the message, so none of them is
 * mistaken for this app's own surface.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Mercury is SaaS-only
 * — there is no self-hosted Mercury — so every Connection this app can hold
 * runs on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is stated explicitly: it is the precondition for the
 * `network` widening below — a status host must never see a Mercury API
 * token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.mercury.com/api/v2/summary.json";

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

/** Statuspage's documented component vocabulary (this page's own values match it). */
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
      component.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mercury platform status",
  description:
    "Component status from status.mercury.com: Support, Bill Pay & Invoicing, Integrations & API, " +
    "Money Movement, Account Management, Account Access, Cards, Mercury Treasury, Account Opening, " +
    "Check Deposits, and Mercury Personal. The verdict comes from the page's own status.indicator " +
    "roll-up, not from any single component.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.mercury.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Mercury — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently pointing this probe at
    // someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.mercury\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Mercury's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      const name = node.name!.trim();
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: name }
        : { state, message: `${name}: ${node.status}` };
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
      notes.push(`affected: ${affected.map((n) => `${n.name?.trim()} (${n.status})`).join(", ")}`);
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
