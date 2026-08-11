/**
 * Is Formstack up?
 *
 * ## Finding the real page meant following a rebrand
 *
 * Checked on 2026-08-11, and the obvious host is a dead end:
 *
 *   | Candidate | What it actually is |
 *   | --- | --- |
 *   | `status.formstack.com` | A real Atlassian-branded page, but it serves the **identical 130,429-byte HTML for every path** — `/api/v2/summary.json` and `/api/v2/definitely-not-real-zzz.json` alike. A catch-all; no readable API. |
 *   | `formstack.statuspage.io` | **200 with 34,835 bytes of real JSON** — and it self-identifies as `page.name: "Intellistack"`, `page.url: "https://www.intellistackstatus.com"`. |
 *   | `www.intellistackstatus.com` | The canonical host that page names. 34,835 B of JSON, and **404 with 0 bytes** on a bogus sibling path. |
 *
 * **Formstack is now Intellistack.** The status page belongs to the parent
 * brand, which is why searching for "Formstack status" lands on a page that
 * cannot be read programmatically. This check uses the canonical
 * `www.intellistackstatus.com`, and refuses any page that stops identifying as
 * Intellistack's or Formstack's.
 *
 * ## Why this check is `informational`
 *
 * The page carries **87 components across the whole Intellistack portfolio** —
 * `Main Application`, `Formstack ID (FSID)`, `Salesforce`, `HawkSoft`,
 * `Google Drive`, `Collaboration`, `Website & Management Portal` and more. Most
 * of those are other products.
 *
 * An incident in HawkSoft — an insurance-agency system the parent owns — says
 * nothing about whether this app's form and submission endpoints work, and the
 * page-level `indicator` goes non-`none` for any of them. At the `degraded`
 * default that would drag every Formstack Connection down for an unrelated
 * product's outage.
 *
 * This is the same call `apps/metabase` and `apps/baserow` make, reached a
 * different way: there the page covers only the vendor's *hosted* offering while
 * many installs are self-hosted; here the page covers a whole *portfolio* while
 * this app touches one product in it. Either way the check is real, worth
 * displaying, and not evidence about a particular Connection — so the derived
 * `auth:access-token` check is what carries the weight.
 *
 * `credential: "none"` is the precondition for the `network` widening below.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://www.intellistackstatus.com/api/v2/summary.json";

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatuspageSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatuspageComponent[];
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

/**
 * Slugify a component name.
 *
 * The portfolio page repeats names across product groups — there are several
 * components called `Main Application` — so the vendor's component **id** is
 * preferred and the slug is only a fallback, the same lesson `apps/paddle`
 * encodes.
 */
export function componentKey(component: StatuspageComponent, index: number): string {
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
  title: "Intellistack platform status",
  description:
    "Component status from www.intellistackstatus.com — the status page for Intellistack, the " +
    "parent brand Formstack is now part of. It covers the whole portfolio, so it is " +
    "informational rather than evidence about this connection.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["www.intellistackstatus.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Formstack — never `down`.
      return { state: "unknown", message: `Statuspage returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body) return { state: "unknown", message: "Statuspage returned an unreadable body" };

    // Guard against a future redirect or rebrand pointing this probe somewhere
    // else — this app has already followed one rebrand to find the page.
    const identity = `${body.page?.name ?? ""} ${body.page?.url ?? ""}`;
    if (identity.trim() && !/intellistack|formstack/i.test(identity)) {
      return {
        state: "unknown",
        message: "status page no longer identifies as Intellistack's or Formstack's",
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Statuspage returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name rides in the message even when healthy: the key is an opaque
      // vendor id, and several components share a display name across the
      // portfolio, so without it a reader cannot tell which product this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const state = mapIndicator(body.status?.indicator);
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
