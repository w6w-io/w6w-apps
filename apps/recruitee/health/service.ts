/**
 * Is Recruitee up?
 *
 * ## The status page is real, but it is NOT Recruitee's own page anymore
 *
 * `status.recruitee.com` 301s to **`status.tellent.com`** (measured
 * 2026-09-05) — an Atlassian Statuspage named `"Tellent"`, `page.id`
 * `bf6k4jctcdck`. It is a portfolio page covering three separate product
 * lines under the Tellent parent brand: Recruitee, "Tellent HR" (a different
 * product — HRIS/performance) and "Grow" (Javelo), plus shared cloud
 * infrastructure (AWS, GCP). Of its 19 components, exactly 6 belong to
 * Recruitee, grouped under the page's own `"Tellent Recruitee"` group:
 * *Recruitee Website*, *Recruitee API* (`api.recruitee.com` — this app's own
 * host), *Recruitee Careers Sites*, *Recruitee Integrations*, *Recruitee Mail
 * Connector*, *Recruitee BI Connector*.
 *
 * ## Why this reads the group's components, not `status.indicator`
 *
 * Apify's `health/service.ts` in this pack trusts `status.indicator` because
 * that page covers one product. This page covers three, so the page-level
 * indicator can flip to "major" or "critical" from an incident on Tellent HR
 * or Grow that says nothing about Recruitee — reading it directly would report
 * outages that never touched this app. The verdict here is rolled up only
 * from the components inside the *Tellent Recruitee* group.
 *
 * ## Matched by the group's NAME, not a hardcoded id
 *
 * The group is found by name (`"Tellent Recruitee"`) in each fetch rather than
 * pinning its numeric `group_id`, so a Statuspage-side id regeneration cannot
 * silently empty the filter — it would instead show up as "found no Recruitee
 * group" and report `unknown`, not a false `ok`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.tellent.com/api/v2/summary.json";

/** The vendor's own label for exactly the bundle of components this app depends on. */
export const RECRUITEE_GROUP_NAME = "Tellent Recruitee";

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

/** The Recruitee-specific components: children of the page's `"Tellent Recruitee"` group. */
export function recruiteeComponents(components: StatusComponent[]): StatusComponent[] {
  const group = components.find((c) => c.group === true && c.name === RECRUITEE_GROUP_NAME);
  if (!group?.id) return [];
  return components.filter((c) => c.group !== true && c.group_id === group.id);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Recruitee platform status",
  description:
    "Component status from status.tellent.com, filtered to the six components in the page's " +
    'own "Tellent Recruitee" group (website, API, careers sites, integrations, mail connector, ' +
    "BI connector) — the page also covers two unrelated Tellent product lines.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.tellent.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Recruitee — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect pointing this probe at an entirely
    // different page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.tellent\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Tellent's" };
    }

    const nodes = recruiteeComponents(body.components ?? []);
    if (nodes.length === 0) {
      return {
        state: "unknown",
        message: `Status page carries no "${RECRUITEE_GROUP_NAME}" group — its structure changed`,
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const id = node.id ?? node.name ?? "component";
      const state = mapComponentStatus(node.status);
      components[id] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const notes: string[] = [];
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
