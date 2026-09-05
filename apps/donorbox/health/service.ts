/**
 * Is Donorbox's API up?
 *
 * `status.donorbox.org` is a real, claimed Atlassian Statuspage
 * (`page.name: "Services"`, confirmed live 2026-09-05) with a grouped
 * component, **`Donorbox API`** (id `xp0vmxdh1qbn`), whose children are
 * `Campaigns API`, `Donations API`, `Donors API`, `Events API`, `Plans API`
 * and `Tickets API` — a one-to-one match with the six resources this app
 * covers (`purchases` is not separately named; it lives under the ticketing
 * surface). Statuspage rolls a group's own `status` field up from its
 * children automatically, so this check reads that one group component
 * rather than the six children individually or the page-level indicator
 * (which also covers unrelated surfaces like `Stripe`, `PayPal` and the
 * `Donorbox App` dashboard that this API-only integration never touches).
 *
 * `status.donorbox.org/api/v2/summary.json` is the same page also reachable
 * via the legacy `donorbox.statuspage.io/api/v2/summary.json` alias — both
 * verified live to return identical content.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.donorbox.org/api/v2/summary.json";

/** The `Donorbox API` group component's id — stable across renames. */
export const API_COMPONENT_ID = "xp0vmxdh1qbn";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
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
  title: "Donorbox API status",
  description:
    "The grouped 'Donorbox API' component on status.donorbox.org, covering the Campaigns, " +
    "Donations, Donors, Events, Plans and Tickets APIs this app reads — not the separate " +
    "Stripe/PayPal payment-gateway or Donorbox App dashboard components.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.donorbox.org"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Donorbox — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const api = (body.components ?? []).find((c) => c.id === API_COMPONENT_ID);
    if (!api) {
      return {
        state: "unknown",
        message: "Status page no longer lists the Donorbox API component",
      };
    }

    const state = mapComponentStatus(api.status);
    const openIncidents = body.incidents?.length ?? 0;
    const notes: string[] = [];
    if (state !== "ok") notes.push(`Donorbox API: ${api.status}`);
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: { [API_COMPONENT_ID]: { state, message: "Donorbox API" } },
      ttlSeconds: 60,
    };
  },
};

export default service;
