/**
 * Is Teamleader Focus up?
 *
 * ## The status page is real, and it is NOT the tempting decoy
 *
 * Checked three ways on 2026-09-01, mirroring `apollo`'s and `apify`'s
 * write-up in this pack:
 *
 * **(a) Two hosts, one page.** `status.teamleader.eu/api/v2/summary.json`
 * and `teamleader.statuspage.io/api/v2/summary.json` both answer `200` with
 * IDENTICAL JSON — `page.id` `3h0654tlc7c0`, `page.name` `"Teamleader"`,
 * `page.url` `https://status.teamleader.eu` — the custom domain is a CNAME
 * onto the same Atlassian Statuspage instance, not a second page.
 *
 * **(b) The obvious decoy is genuinely unclaimed.**
 * `teamleaderfocus.statuspage.io/api/v2/summary.json` (note: no hyphen,
 * matching the vendor's own subdomain style) answers `200` with ~128 KB of
 * Statuspage's OWN marketing HTML — the standard signature of an unclaimed
 * Statuspage subdomain this pack has hit before (see `apify`, `apollo`).
 * `status.focus.teamleader.eu` does not resolve at all.
 *
 * **(c) It describes the right product.** The component list is 41 rows
 * covering `Teamleader Focus Web App`, `Contacts`, `Companies`, `Deals`,
 * `Invoices`, `Projects`, `Timesheets`, `API and integration services`
 * (a GROUP) with `API endpoints` and `Webhooks` as its children, plus
 * upstream dependencies (Google Services, Exchange Web Services, Dropbox
 * integration).
 *
 * ## The component this check follows
 *
 * `API endpoints` (id `t6pc1hl9dkm3`) — the specific child of the `API and
 * integration services` group that answers for `api.focus.teamleader.eu`,
 * as distinct from its sibling `Webhooks` (not used by this app, since it
 * declares no `TriggerDefinition`) and from the dozens of web-app-only
 * components (`Dashboard`, `Calendar`, `Global Search`, …) this app never
 * touches. `API and integration services` itself is a Statuspage GROUP —
 * `group: true` — whose own `status` merely mirrors its children, so it is
 * read for context but not folded into the verdict a second time.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Teamleader Focus is
 * SaaS-only (no self-hosted deployment), so an `API endpoints` incident here
 * really is evidence about every Connection this app can hold.
 *
 * `credential: "none"` is the default for `kind: "service"`, stated
 * explicitly because it is the precondition for widening `network` below —
 * a status host must never see an OAuth access token.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.teamleader.eu/api/v2/summary.json";

/** The component this check follows — see file header. */
export const API_COMPONENT_ID = "t6pc1hl9dkm3";

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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Teamleader Focus platform status",
  description: "The 'API endpoints' component from status.teamleader.eu — the specific part of " +
    "Teamleader's own status page that answers for api.focus.teamleader.eu, distinct from the " +
    "web-app-only components this integration never touches.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.teamleader.eu"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.teamleader\.eu(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Teamleader's" };
    }

    const api = body.components?.find((c) => c.id === API_COMPONENT_ID);
    if (!api) {
      return { state: "unknown", message: "'API endpoints' component missing from status page" };
    }

    const state = mapComponentStatus(api.status);
    const openIncidents = body.incidents?.length ?? 0;
    const notes: string[] = [];
    if (state !== "ok") notes.push(`API endpoints: ${api.status}`);
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: { [API_COMPONENT_ID]: { state, message: api.name } },
      ttlSeconds: 60,
    };
  },
};

export default service;
