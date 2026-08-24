/**
 * Is Clio up?
 *
 * ## The status page is real, checked three ways on 2026-08-24
 *
 * Clio publishes at **`status.clio.com`**, DNS-CNAMEd to
 * `statuspage.incident.io` — an incident.io-hosted status page, exposing a
 * Statuspage-v2-COMPATIBLE JSON API (same `page` / `status` / `incidents`
 * shape) at `/api/v2/*`.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No: `/api/v2/summary.json`
 * (998 bytes) and `/api/v2/status.json` (211 bytes) both answer `200` with
 * distinct JSON; `/api/v2/definitely-not-real-zzz.json` answers a bare `404`.
 *
 * **(b) Does the page describe THIS product?** Yes — `page.name` is
 * "Clio Status Pages", `page.url` is `https://status.clio.com/`, and the
 * page's own HTML (server-rendered, not this JSON API) lists genuine Clio
 * product components: Clio Manage, Clio Grow, Clio Payments, Clio Draft,
 * Clio Work, Clio Accounting, Clio File - eFiling, Clio Manage AI, Clio
 * Calendar Rules.
 *
 * **(c) Is any of that in the machine-readable feed?** No, and this is worth
 * stating plainly rather than silently working around: `/api/v2/summary.json`
 * and `/api/v2/components.json` both answer `components: []`. incident.io's
 * public v2 API does not expose the per-component breakdown this particular
 * page's own frontend renders (that comes from a separate, undocumented
 * endpoint the page's Next.js bundle calls). So this check reports Clio's
 * PAGE-LEVEL `status.indicator` only — the same "indicator, not components"
 * shape several other apps in this pack use when a vendor's page-level
 * summary is the only thing actually published (`apps/mailchimp`,
 * `apps/notion`).
 *
 * `credential: "none"` is the `kind: "service"` default, stated explicitly
 * because it is the precondition for the extra egress below — a status host
 * must never see a Clio access token.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.clio.com/api/v2/summary.json";

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  status?: { indicator?: string; description?: string };
  incidents?: Array<{ name?: string; status?: string; impact?: string }>;
  scheduled_maintenances?: unknown[];
}

/**
 * incident.io's Statuspage-v2-compatible page indicator vocabulary:
 * `none`, `minor`, `major`, `critical` — observed live on 2026-08-24
 * (`"indicator": "none"` on an otherwise-normal day). Scheduled maintenance
 * is reported separately, via `scheduled_maintenances`, not as an indicator
 * value, so it is surfaced in `message` rather than mapped here.
 */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
      return "degraded";
    case "major":
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Clio platform status",
  description: "Page-level indicator from status.clio.com. Component-level detail is not exposed " +
    "by the vendor's machine-readable API — see this file's own doc comment.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.clio.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Clio — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect pointing this probe at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.clio\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Clio's" };
    }

    const indicator = body.status?.indicator;
    const state = mapIndicator(indicator);

    const openIncidents = (body.incidents ?? []).filter((i) => i.status !== "resolved");
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (openIncidents.length > 0) {
      notes.push(
        `${openIncidents.length} open incident(s): ${
          openIncidents.map((i) => i.name).filter(Boolean).join(", ")
        }`,
      );
    }
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
