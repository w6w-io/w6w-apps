/**
 * Is OpusClip up?
 *
 * ## The status page is real, and it is NOT an Atlassian Statuspage
 *
 * OpusClip publishes at `status.opus.pro`, verified three ways on 2026-09-05:
 *
 * - **DNS.** `status.opus.pro` is a CNAME to `cname.instatus.com` — this is an
 *   Instatus-hosted page, not the Atlassian Statuspage most of this pack's
 *   other `service` checks read.
 * - **Content, not just a 200.** `GET /api/v2/summary.json` answers
 *   `{"page":{"id":..., "name":"OpusClip","url":"https://status.opus.pro","status":"UP"}}` —
 *   Instatus's own documented shape (`instatus.com/help/api/public-data`), and
 *   it names the right product.
 * - **A live sibling-path warning.** `GET /api/v2/incidents/unresolved.json`
 *   (a real Instatus route per its API docs) answered on the same host with a
 *   **completely different tenant's** status page HTML ("v2の事务所" / `v2.instatus.com`)
 *   instead of a 404 or empty result. Instatus's `/api/v2/*` surface is
 *   evidently multi-tenant-routed in a way that does not always resolve by the
 *   requested hostname, so this check calls **only** the two paths verified to
 *   answer for `status.opus.pro` itself (`summary.json`, `components.json`)
 *   and guards `page.name`/`page.url` before trusting anything else in the body.
 *
 * ## A component's own `status` does not reflect its incident
 *
 * `GET /api/v2/components.json` returned, live on 2026-09-05, entries like:
 *
 * ```json
 * { "name": "Video Render Service", "status": "OPERATIONAL",
 *   "activeIncidents": [{ "status": "INVESTIGATING", "impact": "MAJOROUTAGE", ... }] }
 * ```
 *
 * The component's `status` field reads `OPERATIONAL` even while it carries an
 * open `MAJOROUTAGE` incident — confirmed live, not a hypothetical. A check
 * that trusted `component.status` alone would report OpusClip healthy during
 * an active major outage. This check instead takes the WORSE of a component's
 * own `status` and the worst `impact` across its `activeIncidents`.
 *
 * ## Page statuses and impacts, per Instatus's own docs
 *
 * `instatus.com/help/api/public-data` states the page-level vocabulary is
 * exactly `UP` / `HASISSUES` / `UNDERMAINTENANCE`. Component/outage status
 * values `OPERATIONAL`, `PARTIALOUTAGE` and `MAJOROUTAGE` are confirmed from
 * Instatus's own `components`/`outages` API docs and live on `status.opus.pro`
 * itself. Any other value this page ever emits (Instatus's docs do not publish
 * an exhaustive enum) maps to `unknown` for a page/component status, but to
 * `degraded` for an incident `impact` specifically — an open incident whose
 * severity code this app does not recognise is still evidence of a problem,
 * never grounds to report `ok`.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. OpusClip is SaaS-only
 * (no self-hosted deployment), so an incident here is evidence about every
 * Connection this app can hold.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_HOST = "status.opus.pro";
export const SUMMARY_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const COMPONENTS_URL = `https://${STATUS_HOST}/api/v2/components.json`;

interface StatusIncident {
  name?: string;
  status?: string;
  impact?: string;
  started?: string;
  url?: string;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string; status?: string };
  activeIncidents?: StatusIncident[];
  activeMaintenances?: unknown[];
}

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  isParent?: boolean;
  activeIncidents?: StatusIncident[];
}

interface ComponentsBody {
  components?: StatusComponent[];
}

/** Instatus's documented page-level vocabulary (`instatus.com/help/api/public-data`). */
export function mapPageStatus(status: string | undefined): HealthState {
  switch (status) {
    case "UP":
      return "ok";
    case "HASISSUES":
    case "UNDERMAINTENANCE":
      return "degraded";
    default:
      return "unknown";
  }
}

/** Confirmed component/outage vocabulary from Instatus's `components`/`outages` API docs. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "OPERATIONAL":
      return "ok";
    case "PARTIALOUTAGE":
    case "UNDERMAINTENANCE":
      return "degraded";
    case "MAJOROUTAGE":
      return "down";
    default:
      return "unknown";
  }
}

/**
 * An incident's `impact`. Unrecognised codes map to `degraded`, not `unknown`
 * — the incident's mere presence is confirmed evidence of a problem, so a
 * severity this app does not recognise must not read as healthier than one it
 * does.
 */
export function mapIncidentImpact(impact: string | undefined): HealthState {
  switch (impact) {
    case "MAJOROUTAGE":
      return "down";
    case "PARTIALOUTAGE":
      return "degraded";
    default:
      return "degraded";
  }
}

/** The worse of a component's own status and its worst open incident's impact. */
export function componentState(component: StatusComponent): HealthState {
  const own = mapComponentStatus(component.status);
  const incidents = component.activeIncidents ?? [];
  if (incidents.length === 0) return own;
  const worstIncident = worstHealthState(incidents.map((i) => mapIncidentImpact(i.impact)));
  return worstHealthState([own, worstIncident]);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "OpusClip platform status",
  description: "Page-level status plus per-component detail from status.opus.pro (Instatus). A " +
    "component's own status can read OPERATIONAL while it carries an open incident, so this " +
    "check also folds in each component's activeIncidents.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const summaryRes = await ctx.fetch(SUMMARY_URL, { headers: { accept: "application/json" } });
    if (!summaryRes.ok) {
      return { state: "unknown", message: `Status page returned ${summaryRes.status}` };
    }
    const summary = await summaryRes.json().catch(() => null) as StatusSummary | null;
    if (!summary?.page) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }

    // Guard against Instatus's multi-tenant routing landing this probe on a
    // different page than status.opus.pro — see the module docs.
    if (summary.page.name !== "OpusClip") {
      return {
        state: "unknown",
        message: `status.opus.pro no longer self-identifies as OpusClip (page.name: ${
          summary.page.name ?? "missing"
        })`,
      };
    }

    const componentsRes = await ctx.fetch(COMPONENTS_URL, {
      headers: { accept: "application/json" },
    });
    const components: Record<string, HealthComponentReport> = {};
    let componentsNote: string | undefined;
    if (componentsRes.ok) {
      const body = await componentsRes.json().catch(() => null) as ComponentsBody | null;
      const nodes = (body?.components ?? []).filter((c) => c?.name && !c.isParent);
      for (const node of nodes) {
        const state = componentState(node);
        const id = node.id ?? node.name!;
        components[id] = state === "ok"
          ? { state, message: node.name }
          : { state, message: `${node.name}: ${node.status}` };
      }
    } else {
      componentsNote = `component detail unavailable (status ${componentsRes.status})`;
    }

    const pageState = mapPageStatus(summary.page.status);
    const componentStates = Object.values(components).map((c) => c.state);
    const state = worstHealthState([pageState, ...componentStates]);

    const notes: string[] = [];
    const openIncidents = summary.activeIncidents ?? [];
    if (openIncidents.length > 0) {
      notes.push(
        `${openIncidents.length} open incident(s): ${
          openIncidents.map((i) => `${i.name} (${i.status}/${i.impact})`).join("; ")
        }`,
      );
    }
    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");
    if (affected.length > 0) {
      notes.push(`affected components: ${affected.map(([, c]) => c.message).join(", ")}`);
    }
    if (componentsNote) notes.push(componentsNote);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: Object.keys(components).length > 0 ? components : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
