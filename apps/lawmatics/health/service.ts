/**
 * Is Lawmatics' OAuth API up?
 *
 * ## Finding the real status page
 *
 * `lawmatics.statuspage.io` is the unclaimed-Statuspage decoy — it 302s
 * straight to Atlassian's own `statuspage.io` marketing page (verified
 * 2026-09-05), never Lawmatics content.
 *
 * `status.lawmatics.com` is the real thing: a claimed **Better Stack** page.
 * Its `/index.json` self-identifies unambiguously —
 * `data.attributes.company_name: "Lawmatics"`, `custom_domain:
 * "status.lawmatics.com"` — and lists five monitored resources, one of which
 * names exactly the surface this app calls:
 *
 *   | `public_name`                       | `explanation`                                              |
 *   | ------------------------------------ | ----------------------------------------------------------- |
 *   | Lawmatics API                        | Processes and provides data for Lawmatics App Client        |
 *   | **Lawmatics OAuth2.0 API**            | **Processes and provides data for third-party developer OAuth2.0 apps** |
 *   | Lawmatics App - app.lawmatics.com     | (unlabelled)                                                 |
 *   | Lawmatics E-Sign Service              | Processes and stamps client values/signatures onto requests |
 *   | Lawmatics Website - www.lawmatics.com | (unlabelled)                                                 |
 *
 * "Lawmatics OAuth2.0 API" is `api.lawmatics.com` for exactly this app's
 * traffic — the page's other four resources (the app client's own backend,
 * the web app, e-sign, the marketing site) are unrelated to what this
 * integration calls, so the reported state is that ONE resource's, not the
 * page's aggregate roll-up (which would mix in an e-sign or website outage
 * that says nothing about this app).
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.lawmatics.com/index.json";

/** The one Better Stack resource that names this app's own API surface. */
export const TRACKED_RESOURCE_NAME = "Lawmatics OAuth2.0 API";

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: {
    public_name?: string;
    status?: string;
  };
}

interface BetterStackPage {
  data?: {
    type?: string;
    attributes?: {
      company_name?: string;
      custom_domain?: string;
    };
  };
  included?: BetterStackResource[];
}

/**
 * Better Stack's resource vocabulary — `operational`, `degraded`, `downtime`,
 * `maintenance`, plus `unknown`/`not_monitored` for a resource with no live
 * reading (measured on this very page, whose resources currently all read
 * `not_monitored`).
 */
export function mapResourceStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
    case "resolved":
      return "ok";
    case "degraded":
    case "maintenance":
      return "degraded";
    case "downtime":
    case "down":
      return "down";
    default:
      return "unknown";
  }
}

/** Slugify a resource's public name into a stable component key. */
export function resourceKey(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Lawmatics OAuth API status",
  description:
    `Resource status from status.lawmatics.com (Better Stack), scoped to the "${TRACKED_RESOURCE_NAME}" ` +
    "component — the one this app's own traffic runs through. The page's other resources (the main " +
    "app client, e-sign, the website) are reported alongside for visibility but do not drive the state.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.lawmatics.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    if (!body?.data?.attributes) {
      return { state: "unknown", message: "Status page did not return its JSON document" };
    }

    const attrs = body.data.attributes;
    const identifies = /lawmatics/i.test(attrs.company_name ?? "") ||
      /lawmatics\.com/i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Lawmatics' " };
    }

    const resources = (body.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );

    const components: Record<string, HealthComponentReport> = {};
    resources.forEach((resource, index) => {
      const state = mapResourceStatus(resource.attributes?.status);
      components[resourceKey(resource, index)] = state === "ok"
        ? { state }
        : { state, message: resource.attributes?.status };
    });

    const tracked = resources.find((r) => r.attributes?.public_name === TRACKED_RESOURCE_NAME);
    if (!tracked) {
      return {
        state: "unknown",
        message: `"${TRACKED_RESOURCE_NAME}" resource is no longer on the status page`,
        components,
      };
    }

    const state = mapResourceStatus(tracked.attributes?.status);
    return {
      state,
      message: state === "ok"
        ? undefined
        : `${TRACKED_RESOURCE_NAME}: ${tracked.attributes?.status}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
