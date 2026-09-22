/**
 * Is the Qualtrics API up?
 *
 * ## The status page is real
 *
 * Qualtrics publishes at **`status.qualtrics.com`**, an Atlassian Statuspage.
 * Verified live on 2026-09-22: `GET /api/v2/summary.json` answers `200`,
 * `application/json`, and the body self-identifies as
 * `"page": {"id": "zzbcdhb83d4t", "name": "Qualtrics", "url": "https://status.qualtrics.com"}`
 * with 36 named components.
 *
 * ## The API component decides the verdict, not the page
 *
 * The page mixes 36 components across products and surfaces, and most of them —
 * `Survey Taking`, `Logins`, `Live Support`, `Email`, `SMS (Text)`,
 * `Product Documentation` — say nothing about the REST API this app calls. The
 * component that does is:
 *
 *     "0g83y8c83cyz" → "API / Developer Platform"
 *
 * So this check reads **that** component and reports its state, rather than the
 * page-level `status.indicator`, which is a worst-of across all 36 and would
 * turn a bad day for `Logins` into "Qualtrics is degraded" for a workflow that
 * only ever reads surveys over the API.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Qualtrics is SaaS-only —
 * there is no self-hosted Qualtrics — so every Connection this app can hold runs
 * on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Qualtrics API token.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.qualtrics.com/api/v2/summary.json";

/**
 * The one component on the page that speaks for this app. Verified live
 * 2026-09-22: `{id: "0g83y8c83cyz", name: "API / Developer Platform",
 * status: "operational"}`.
 */
export const API_COMPONENT_ID = "0g83y8c83cyz";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
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
  title: "Qualtrics platform status",
  description: "The `API / Developer Platform` component of status.qualtrics.com, read from its " +
    "Statuspage summary API. The page's other components (Survey Taking, Logins, Email, …) are " +
    "UI and delivery surfaces that say nothing about the REST API.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.qualtrics.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Qualtrics — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.qualtrics\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Qualtrics'" };
    }

    const component = (body.components ?? []).find((c) => c?.id === API_COMPONENT_ID);
    if (!component) {
      return {
        state: "unknown",
        message:
          `Status page carries no "${API_COMPONENT_ID}" (API / Developer Platform) component`,
      };
    }

    const state = mapComponentStatus(component.status);
    return {
      state,
      message: state === "ok"
        ? `${component.name ?? "API / Developer Platform"} operational`
        : `${component.name ?? "API / Developer Platform"}: ${component.status}`,
      components: {
        [API_COMPONENT_ID]: state === "ok"
          ? { state, message: component.name }
          : { state, message: `${component.name}: ${component.status}` },
      },
      ttlSeconds: 60,
    };
  },
};

export default service;
