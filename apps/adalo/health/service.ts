/**
 * Is Adalo up? — a custom-built status page at status.adalo.com (Vercel-hosted, NOT
 * Statuspage/Instatus-shaped: confirmed live 2026-09-05, `adalo.statuspage.io` answers
 * `401 "Your page is inactive"`, the real decoy pattern for an unclaimed Statuspage page).
 *
 * `/api/v2/summary.json` is real but page-level only (`{"page":{"status":"UP"}}`, no
 * components) — useless for telling "the editor is down" apart from "the Collections API is
 * down". `/api/v2/components.json` is the useful one: a real, nested component tree that
 * names a component literally `"Collections API"` ("This service handles all of your requests
 * to the Collections API. If this is down, your requests to this API will fail.") under the
 * `Published Apps` group, distinct from `App Editing` and `Publishing` (which are about the
 * Adalo builder itself, not this app's traffic). `/api/v2/incidents.json` 404s — this page
 * does not expose incident history, only current component state.
 *
 * Only Statuspage's OPERATIONAL state has been observed live (all-green at verification time);
 * this page is not Statuspage, so its full status vocabulary isn't documented — anything not
 * recognized below is reported `unknown` rather than guessed at.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const COMPONENT: Record<string, HealthState> = {
  OPERATIONAL: "ok",
  DEGRADED_PERFORMANCE: "degraded",
  PARTIAL_OUTAGE: "degraded",
  UNDER_MAINTENANCE: "degraded",
  MAJOR_OUTAGE: "down",
};

const STATUS_HOST = "status.adalo.com";

interface StatusComponent {
  name?: string;
  status?: string;
  isParent?: boolean;
  children?: StatusComponent[];
}

/** Depth-first search for a component by exact name. */
function findComponent(nodes: StatusComponent[], name: string): StatusComponent | undefined {
  for (const node of nodes) {
    if (node.name === name) return node;
    if (node.children?.length) {
      const found = findComponent(node.children, name);
      if (found) return found;
    }
  }
  return undefined;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Adalo platform status",
  description: "status.adalo.com component tree, scoped to the 'Collections API' component. " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as { components?: StatusComponent[] };
    const collectionsApi = findComponent(body.components ?? [], "Collections API");
    if (!collectionsApi) {
      return { state: "unknown", message: "'Collections API' component not found in feed" };
    }

    const state = COMPONENT[collectionsApi.status ?? ""] ?? "unknown";
    return {
      state,
      message: state === "unknown" ? `unrecognized status "${collectionsApi.status}"` : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
