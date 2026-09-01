/**
 * Is Holded's API up?
 *
 * ## The status page is real. Verified on 2026-09-01
 *
 * `www.holded.com/es/desarrolladores` links to no status page at all, and
 * `status.holded.com` is a marketing redirect, not a status feed — so this
 * check goes straight to the Atlassian Statuspage instance Holded actually
 * runs it on: `holded.statuspage.io`.
 *
 * **(a) Content and shape.** `GET /api/v2/summary.json` answers
 * `200 application/json`, parsing as the Statuspage v2 schema — not the
 * ~127,700-byte HTML shell an *unclaimed* `*.statuspage.io` page serves.
 *
 * **(b) Does the page describe THIS product?** Yes:
 * `"page": {"id": "k5ltb2nqf6zg", "name": "Holded", "url":
 * "https://holded.health"}`, and its components are named `Holded Web`,
 * `Holded API`, `Holded POS App (iOS/Android)`, `Holded App (iOS/Android)`,
 * plus an `External Services` group (banks and other third parties Holded
 * itself depends on).
 *
 * ## Only one component is this app's business
 *
 * This app calls exactly one host, `api.holded.com`. `Holded Web` (the
 * browser app), the two mobile apps and the third-party `External Services`
 * group cover surfaces this app never touches, so only the `Holded API`
 * component (id `s3bhwxfr5jwy`) feeds the verdict — reporting the whole
 * page's worst status would mark this app degraded over a mobile-app-only
 * incident it was never exposed to.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://holded.statuspage.io/api/v2/summary.json";

/** Statuspage's own id for the "Holded API" component. Stable across renames. */
export const API_COMPONENT_ID = "s3bhwxfr5jwy";

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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Holded API status",
  description:
    "The 'Holded API' component from holded.statuspage.io — the only component this app's " +
    "traffic actually crosses.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["holded.statuspage.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Holded — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently pointing this probe at
    // someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)holded\.health(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Holded's" };
    }

    const api = (body.components ?? []).find((c) => c.id === API_COMPONENT_ID);
    if (!api) {
      return { state: "unknown", message: "Status page no longer lists a 'Holded API' component" };
    }

    const state = mapComponentStatus(api.status);
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (state !== "ok") notes.push(`Holded API: ${api.status}`);
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: { [API_COMPONENT_ID]: { state, message: "Holded API" } },
      ttlSeconds: 60,
    };
  },
};

export default service;
