/**
 * Is Airparser up?
 *
 * ## The status page is real, checked three ways on 2026-09-05
 *
 * Airparser publishes at **`status.airparser.com`**, a custom-domain **Better
 * Stack** page (its `<title>` is literally "Better Stack").
 *
 * **(a) Bogus sibling paths — is this a catch-all?** No. Unlike some Better
 * Stack pages in this pack (`apps/baserow`), the Statuspage-shaped paths
 * (`/api/v2/summary.json`, `/history.atom`, `/api/v2/components.json`) all
 * **301 redirect** rather than answering 200 with HTML, and a nonsense path
 * (`/definitely-not-real-zzz.json`) also 301s. Better Stack's own JSON
 * document is at a different, un-prefixed path:
 *
 *   | Path                                   | Status | Bytes  |
 *   | --------------------------------------- | ------ | ------ |
 *   | `/index.json`                           | 200    | ~34,800 |
 *   | `/definitely-not-real-zzz.json`         | 301    | 0      |
 *
 * **(b) Content-type AND body.** `/index.json` parses as Better Stack's
 * `{"data": {"type": "status_page", "attributes": {...}}, "included": [...]}`
 * shape.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "attributes": { "company_name": "Airparser", "company_url":
 *                      "https://airparser.com", "custom_domain":
 *                      "status.airparser.com", "aggregate_state": "operational" }
 *
 * and its resources are Airparser's own: "Airparser API", "Airparser MCP
 * Server", "airparser.com" and "Airparser App".
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Airparser is
 * SaaS-only — the vendor's docs describe no self-hosted deployment option —
 * so every Connection this app can hold runs on exactly the infrastructure
 * this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see an Airparser API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.airparser.com/index.json";

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: {
    public_name?: string;
    explanation?: string;
    status?: string;
    availability?: number;
  };
}

interface BetterStackPage {
  data?: {
    type?: string;
    attributes?: {
      company_name?: string;
      company_url?: string;
      custom_domain?: string;
      aggregate_state?: string;
    };
  };
  included?: BetterStackResource[];
}

/**
 * Better Stack's resource vocabulary, matching `apps/baserow`'s own reading
 * of the same platform: `operational`, `degraded`, `downtime`, `maintenance`,
 * plus `unknown` for anything else (including a resource with no recent
 * data).
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

/** The page-level roll-up, `data.attributes.aggregate_state`. */
export function mapAggregateState(state: string | undefined): HealthState {
  switch (state) {
    case "operational":
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
  title: "Airparser platform status",
  description:
    "Resource status from status.airparser.com (Better Stack). Covers the Airparser API, the " +
    "MCP server, the main web app and airparser.com itself.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.airparser.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about Airparser — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    if (!body?.data?.attributes) {
      return {
        state: "unknown",
        message: "Status page did not return its JSON document — the /index.json route may be gone",
      };
    }

    // Guard against a future redirect or rebrand silently pointing this probe
    // at somebody else's page — a healthy, claimed page belonging to an
    // entirely different product would otherwise read as good news.
    const attrs = body.data.attributes;
    const identifies = /airparser/i.test(attrs.company_name ?? "") ||
      /airparser\.com/i.test(attrs.company_url ?? "") ||
      /airparser\.com/i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Airparser's" };
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

    const aggregate = attrs.aggregate_state;
    const state = aggregate === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapAggregateState(aggregate);

    const affected = resources.filter((r) => mapResourceStatus(r.attributes?.status) !== "ok");
    const notes: string[] = [];
    if (aggregate) notes.push(`aggregate: ${aggregate}`);
    if (affected.length > 0) {
      notes.push(
        `affected: ${
          affected.map((r) => `${r.attributes?.public_name} (${r.attributes?.status})`).join(", ")
        }`,
      );
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: Object.keys(components).length > 0 ? components : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
