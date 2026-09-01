/**
 * Is Zendesk Sell up?
 *
 * ## `status.zendesk.com` is real, is NOT Atlassian Statuspage, and DOES carry
 * a Sell-specific component — three separate things worth checking, per the
 * pack's own "a page with the right name is not proof of the right component"
 * lesson.
 *
 * **(a) It exists and is not a catch-all.** `https://status.zendesk.com/` (200,
 * verified 2026-09-01) serves a 1,314-byte client-rendered shell — a genuine
 * Zendesk-built dashboard (`<title>Zendesk Status</title>`, a Zendesk
 * Google-Analytics id in the page), not a generic parked/unclaimed page and not
 * the vendor's Support-ticket product.
 *
 * **(b) It is a private React SPA, not Statuspage.** Unlike Apify's
 * `status.apify.com` (a documented Atlassian Statuspage `api/v2/summary.json`),
 * `status.zendesk.com` has no such public, documented JSON API — every
 * `/api/v2/*` and `/history.{atom,rss}` guess this app tried answered `404`.
 * The dashboard instead calls its own internal endpoints, discovered by reading
 * its shipped JS bundle and confirmed live:
 *
 *   - `GET /api/ssp/services` — the product/component list. Verified
 *     2026-09-01: service id `"63"` is `{"name": "Sales", "slug": "sell"}` —
 *     the `slug` is what proves this is genuinely the Sell product, not a
 *     same-named coincidence (the page also lists `"Support"`, `"Chat"`,
 *     `"Voice"`, etc., each with its own distinct slug).
 *   - `GET /api/ssp/incidents` — a JSON:API-shaped incident log. Each
 *     `included` entry of `type: "incidentService"` carries a structural
 *     `serviceId` and a structural `resolvedAt` (ISO timestamp or `null`) — a
 *     real machine field, not prose sniffed for the word "resolved".
 *
 * **(c) Neither endpoint is documented anywhere**, so this check is reading an
 * internal API that could be reshaped without notice — a materially different
 * risk from Apify's published Statuspage contract. Every parse step below is
 * therefore defensive: any shape this app doesn't recognise reports `unknown`,
 * never `down` and never `ok`. That is the deliberate trade this check makes,
 * instead of the `unavailable` declaration a page with no findable status
 * surface at all would get — Sell demonstrably HAS one, so an honest "no
 * signal exists" would be the wrong claim to make.
 *
 * `credential: "none"` (the `kind: "service"` default, stated explicitly) is
 * the precondition for the `network` widening below: the status host must
 * never see a Sell access token.
 */
import type { HealthCheckDefinition, HealthState, HealthTimelineEntry } from "@w6w/types";

export const INCIDENTS_URL = "https://status.zendesk.com/api/ssp/incidents";

/**
 * `GET /api/ssp/services` -> `{"id": "63", "attributes": {"name": "Sales", "slug": "sell"}}`,
 * verified 2026-09-01. Hardcoded rather than resolved per-check: the service
 * catalog is effectively static (adding a product line is rare and would need
 * this file updated anyway to keep meaning "Sell"), and skipping that lookup
 * halves the calls this check makes.
 */
export const SELL_SERVICE_ID = "63";

interface IncidentAttributes {
  name?: string;
  impact?: string;
  status?: string;
  startedAt?: string;
  resolvedAt?: string | null;
  postmortem?: string | null;
}

interface IncidentServiceAttributes {
  incidentId?: number;
  serviceId?: number;
}

interface JsonApiResource<A> {
  id?: string;
  type?: string;
  attributes?: A;
}

interface IncidentsResponse {
  data?: JsonApiResource<IncidentAttributes>[];
  included?: JsonApiResource<IncidentServiceAttributes>[];
}

/** Zendesk's own impact vocabulary, observed live: `critical`, `major`, `minor`. */
export function mapImpact(impact: string | undefined): HealthState {
  switch (impact) {
    case "critical":
      return "down";
    case "major":
    case "minor":
      return "degraded";
    default:
      return "unknown";
  }
}

/** Worst-first, matching `HEALTH_STATE_RANK` in `@w6w/types`. */
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

export interface SellIncidentReport {
  state: HealthState;
  message?: string;
  timeline: HealthTimelineEntry[];
}

/**
 * Turn the raw `/api/ssp/incidents` payload into a report scoped to
 * {@link SELL_SERVICE_ID}. Exported and pure so the parsing — the part most
 * likely to break when Zendesk reshapes this undocumented endpoint — is
 * testable without a fetch.
 */
export function reportFromIncidents(body: IncidentsResponse): SellIncidentReport {
  const incidents = body.data;
  const included = body.included;
  if (!Array.isArray(incidents) || !Array.isArray(included)) {
    return { state: "unknown", message: "unrecognised /api/ssp/incidents shape", timeline: [] };
  }

  const sellIncidentIds = new Set(
    included
      .filter((r) =>
        r.type === "incidentService" && String(r.attributes?.serviceId) === SELL_SERVICE_ID
      )
      .map((r) => r.attributes?.incidentId)
      .filter((id): id is number => typeof id === "number"),
  );

  const timeline: HealthTimelineEntry[] = [];
  const openNames: string[] = [];
  let state: HealthState = "ok";

  for (const incident of incidents) {
    const idNum = incident.id !== undefined ? Number(incident.id) : undefined;
    if (idNum === undefined || !sellIncidentIds.has(idNum)) continue;

    const a = incident.attributes ?? {};
    const isOpen = a.status !== "resolved" && (a.resolvedAt === null || a.resolvedAt === undefined);
    const entryState = isOpen ? mapImpact(a.impact) : "ok";

    timeline.push({
      id: incident.id,
      title: a.name ?? "(untitled incident)",
      state: entryState,
      startedAt: a.startedAt,
      resolvedAt: a.resolvedAt ?? undefined,
      link: a.postmortem ?? undefined,
    });

    if (isOpen) {
      if (RANK[entryState] > RANK[state]) state = entryState;
      openNames.push(a.name ?? "(untitled incident)");
    }
  }

  return {
    state,
    message: openNames.length > 0 ? `open: ${openNames.join("; ")}` : undefined,
    timeline,
  };
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Zendesk Sell platform status",
  description:
    'Open incidents scoped to the Sales/Sell component (service id 63, slug "sell") of ' +
    "status.zendesk.com's incident log. See this file's module doc for why that host has no " +
    "documented status API and how this check treats it defensively.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.zendesk.com"] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(INCIDENTS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status endpoint says nothing about Sell itself — never `down`.
      return { state: "unknown", message: `Status API returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as IncidentsResponse | null;
    if (!body) return { state: "unknown", message: "Status API returned an unreadable body" };

    const report = reportFromIncidents(body);
    return {
      state: report.state,
      message: report.message,
      timeline: report.timeline,
      ttlSeconds: 300,
    };
  },
};

export default service;
