/**
 * Is PhantomBuster up?
 *
 * ## The status page is real — checked three ways on 2026-09-01
 *
 * PhantomBuster publishes at **`status.phantombuster.com`**, an Atlassian
 * Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No: `/api/v2/summary.json`
 * answers 200 with 2,545 bytes of real JSON, and `/api/v2/status.json`
 * answers 200 with a 226-byte page-level summary. Both parse as the Statuspage
 * v2 schema.
 *
 * **(b) Does the page describe THIS product?** Yes:
 * `"page": {"id": "xl1jfdffsz3j", "name": "Phantombuster",
 * "url": "https://status.phantombuster.com"}` — and `phantombuster.statuspage.io`
 * (the underlying Statuspage host) serves byte-identical JSON, confirming it
 * is not an unclaimed decoy.
 *
 * **(c) The components are genuinely PhantomBuster's own,** not a mix of
 * upstream vendors: `Phantoms` (the agent-execution fleet), `API`,
 * `Phantom file delivery`, `Phantom email notifications`, `Content CDN`,
 * `Image CDN`, `Developer documentation` — seven flat components, no groups.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. PhantomBuster is
 * SaaS-only — there is no self-hosted PhantomBuster — so every Connection this
 * app can hold runs on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly: it is the precondition for the `network` widening below — a
 * status host must never see a PhantomBuster API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.phantombuster.com/api/v2/summary.json";

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

const service: HealthCheckDefinition = {
  key: "service",
  title: "PhantomBuster platform status",
  description:
    "Component status from status.phantombuster.com: Phantoms (the agent-execution fleet), API, " +
    "Phantom file delivery, Phantom email notifications, Content CDN, Image CDN and Developer " +
    "documentation.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.phantombuster.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about PhantomBuster — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently pointing this probe at someone
    // else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.phantombuster\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as PhantomBuster's",
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const key = node.id ?? node.name!.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const state = mapComponentStatus(node.status);
      components[key] = state === "ok" ? { state, message: node.name } : {
        state,
        message: `${node.name}: ${node.status}`,
      };
    }

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
