/**
 * Is Tapfiliate up?
 *
 * ## Finding the real status page took three tries
 *
 * `status.tapfiliate.com` — guessed from the vendor's own domain — resolves
 * (200), but is a client-rendered SPA whose obvious Statuspage-shaped paths
 * (`/api/v2/summary.json`, `/status.json`, `/api/status`) all 404 onto the
 * SPA's own shell. `tapfiliate.statuspage.io` redirects to statuspage.io's
 * marketing page (unclaimed). The real API — verified by content, not just
 * status code — is a different vendor entirely:
 *
 *     GET https://status.tapfiliate.com/api/v1/status
 *     -> {"page":{"id":3341,"name":"Tapfiliate Status Page","state":"operational", …}}
 *
 * That `/api/v1/…` shape belongs to **SorryApp** (`sorryapp.com`), confirmed
 * by the page's own script tags (`assets2.sorryapp.com`,
 * `assets3.sorryapp.com/brand_logos/…/tap-logo-status-page.png`) — a
 * white-labelled hosted status page product, not Atlassian Statuspage.
 * `GET /api/v1/components` (fetched 2026-09-05) lists five components, one of
 * them named exactly `Tapfiliate API`:
 *
 *     Tapfiliate API · Tapfiliate Webapp · Tapfiliate Tracking Servers ·
 *     Tapfiliate Tracking Script · Tapfiliate Assets
 *
 * ## Only the API component decides this check's state
 *
 * This app calls `api.tapfiliate.com` and nothing else. The other four
 * components (the dashboard web app, the click/conversion tracking pixel
 * infrastructure, the JS tracking snippet, and static assets) can degrade
 * independently without this app's calls being affected at all, so folding
 * their state into the verdict would report a REST outage that isn't
 * happening. Their states are still surfaced in `components`, for a reader
 * trying to understand a correlated symptom (e.g. conversions not being
 * attributed because the Tracking Script is down, which this app's own calls
 * would not otherwise explain).
 *
 * ## State vocabulary
 *
 * Only `"operational"` was observed live (the account has had no incidents in
 * its recent history — `GET /api/v1/notices` returned zero entries). SorryApp
 * is not Atlassian Statuspage, and its full state vocabulary is not
 * documented publicly, so this mapper recognises the common
 * Statuspage-family terms defensively and falls back to `"unknown"` — never
 * `"ok"` — for anything unrecognised, the same discipline
 * `apps/apify/health/service.ts` uses for the same reason: guessing a
 * healthy verdict for an unrecognised string is worse than reporting
 * `unknown`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.tapfiliate.com/api/v1/status";
export const COMPONENTS_URL = "https://status.tapfiliate.com/api/v1/components";

export const API_COMPONENT_NAME = "Tapfiliate API";

interface StatusPageBody {
  page?: { id?: number; name?: string; state?: string; state_text?: string; url?: string };
}

interface StatusComponent {
  id?: number;
  name?: string;
  state?: string;
}

interface ComponentsBody {
  components?: StatusComponent[];
}

/** Maps a SorryApp/Statuspage-family state string. Unrecognised -> `unknown`, never `ok`. */
export function mapState(state: string | undefined): HealthState {
  switch (state) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
    case "maintenance":
      return "degraded";
    case "major_outage":
    case "outage":
      return "down";
    default:
      return "unknown";
  }
}

/** Slug a component name into a stable-ish key when no vendor id is usable as one. */
export function componentKey(component: StatusComponent, index: number): string {
  if (component.name) {
    return component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Tapfiliate platform status",
  description:
    "Component status from status.tapfiliate.com (a SorryApp-hosted page). The verdict tracks " +
    'only the "Tapfiliate API" component — the Webapp, Tracking Servers, Tracking Script and ' +
    "Assets components are reported for context but do not affect this app's own calls.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.tapfiliate.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Tapfiliate itself — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as ComponentsBody | null;
    const nodes = body?.components ?? [];
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapState(node.state);
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.state}` };
    });

    const apiComponent = nodes.find((n) => n.name === API_COMPONENT_NAME);
    if (!apiComponent) {
      // The vendor renamed or removed the component this check anchors on —
      // report `unknown` rather than silently trusting a page-level rollup
      // that may include the other four, unrelated components.
      return {
        state: "unknown",
        message: `Status page no longer lists a "${API_COMPONENT_NAME}" component`,
        components,
      };
    }

    const state = mapState(apiComponent.state);
    const affected = nodes.filter((n) => n !== apiComponent && mapState(n.state) !== "ok");
    const notes: string[] = [];
    if (state !== "ok") notes.push(`Tapfiliate API: ${apiComponent.state}`);
    if (affected.length > 0) {
      notes.push(`also affected: ${affected.map((n) => `${n.name} (${n.state})`).join(", ")}`);
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
