/**
 * Is Feedly up?
 *
 * ## Finding the real status page
 *
 * Checked on 2026-09-06:
 *
 *  - **`feedly.statuspage.io`** — the unclaimed-Statuspage decoy: a plain
 *    `302` to statuspage.io's own marketing page.
 *  - **`status.feedly.com`** — a real, claimed **Better Stack** page. The
 *    Statuspage-shaped paths under it (`/api/v2/summary.json`,
 *    `/history.atom`, `/history.rss`) all `301` away — this page is Better
 *    Stack only, not Statuspage-compatible.
 *  - **`status.feedly.com/index.json`** — Better Stack's own JSON document,
 *    200, self-identifying:
 *
 *        "data": {"type": "status_page", "attributes": {
 *           "company_name": "Feedly", "company_url": "https://feedly.com",
 *           "custom_domain": "status.feedly.com",
 *           "aggregate_state": "operational"}}
 *
 * It carries exactly **one** monitored resource, `public_name: "feedly.com"`,
 * whose own `explanation` field states its scope directly: "Feedly platform,
 * including web and mobile apps, and the API." That is exactly this app's
 * surface — unlike a self-hosted product, Feedly for Threat Intelligence has
 * no on-prem option, so every Connection this app can hold runs on the
 * infrastructure this page describes. This check is therefore left at the
 * `degraded` default for `kind: "service"`, not `informational`.
 *
 * ## Posture
 *
 * `credential: "none"` is the default for `kind: "service"`, stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see a Feedly API token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.feedly.com/index.json";

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
 * Better Stack's resource vocabulary, as used pack-wide (see `apps/baserow`):
 * `operational`, `degraded`, `downtime`, `maintenance`, `unknown` for
 * anything unrecognised.
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
  title: "Feedly platform status",
  description:
    "Resource status from status.feedly.com (Better Stack). The page's single monitored " +
    'resource explicitly covers "the API" alongside the web and mobile apps.',
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.feedly.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about Feedly — never `down`.
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
    // at somebody else's status page.
    const attrs = body.data.attributes;
    const identifies = /feedly/i.test(attrs.company_name ?? "") ||
      /feedly\.com/i.test(attrs.company_url ?? "") ||
      /feedly\.com/i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Feedly's" };
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
