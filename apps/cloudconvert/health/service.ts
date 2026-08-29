import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is CloudConvert up?
 *
 * ## Real, and NOT the Atlassian Statuspage shape most of this pack expects
 *
 * `status.cloudconvert.com` is a **Better Stack** page (the same family as Hugging
 * Face's and Baserow's in this pack). Verified three ways on 2026-08-29:
 *
 * **(a) The Atlassian-shaped paths this pack usually tries first do not exist here.**
 * `/api/v2/summary.json`, `/api/v2/status.json` and a nonsense path all answer the
 * **identical** `301` to `https://status.cloudconvert.com/` with **0 bytes** — the site's
 * generic redirect-everything-unknown behaviour, not a Statuspage 404. The real route,
 * `/index.json`, answers `200` with 77,783 bytes of Better Stack's own JSON document.
 *
 * **(b) The document self-identifies.** `data.attributes.company_name` is `"CloudConvert"`,
 * `company_url` is `"https://cloudconvert.com"`, and `custom_domain` is
 * `"status.cloudconvert.com"`.
 *
 * **(c) It carries a component that matches this app.** Three sections — `Endpoints`
 * (`Webinterface`, **`API`**), `Regions` (`EU Central`, `US East`), `Conversions`
 * (`General`, `Video & Audio`, `Office`, `iWork`) — eight resources in total, all
 * `operational` when read.
 *
 * ## Why nothing here is capped at `informational`
 *
 * Unlike Hugging Face's page (which covers the Hub but not the third-party inference
 * providers this app's actions actually call), every resource on CloudConvert's page is
 * CloudConvert's own infrastructure — there is no third party in this app's call graph
 * for the page to fail to cover. The default `degraded` severity for `kind: "service"`
 * is left as-is.
 *
 * ## `aggregate_state`, not a worst-component fold
 *
 * Better Stack's document carries its own page-level roll-up at
 * `data.attributes.aggregate_state`, exactly the role Statuspage's `status.indicator`
 * plays elsewhere in this pack — trusted over recomputing a verdict from the component
 * list, so a single degraded region does not silently get rounded up to "operational" by
 * an incomplete local rule, and so a future component this check does not specifically
 * know how to read still contributes to the verdict CloudConvert itself computed.
 */
export const STATUS_URL = "https://status.cloudconvert.com/index.json";

interface BetterStackResource {
  type?: string;
  id?: string;
  attributes?: { public_name?: string; status?: string };
}

interface BetterStackPage {
  data?: { type?: string; attributes?: { company_name?: string; aggregate_state?: string } };
  included?: BetterStackResource[];
}

/** Better Stack's resource-status vocabulary, as observed across this pack's other apps. */
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

/** Same vocabulary, for the page-level `aggregate_state` roll-up. */
export function mapAggregateState(state: string | undefined): HealthState {
  return mapResourceStatus(state);
}

/** Slugify a resource's public name into a stable component key. */
export function resourceKey(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "CloudConvert platform status",
  description:
    "Component status from status.cloudconvert.com: the API and web interface, the two " +
    "processing regions (EU Central, US East), and the four conversion-engine groups " +
    "(General, Video & Audio, Office, iWork).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.cloudconvert.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    if (!res.ok) {
      await res.body?.cancel();
      // A broken status page says nothing about CloudConvert itself — never `down`.
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    if (!body?.data?.attributes) {
      return {
        state: "unknown",
        message: "the status page did not return its JSON document — the /index.json route " +
          "may have moved",
      };
    }
    if (!/cloudconvert/i.test(body.data.attributes.company_name ?? "")) {
      return {
        state: "unknown",
        message: "the status page no longer self-identifies as CloudConvert's",
      };
    }

    const resources = (body.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    if (resources.length === 0) {
      return { state: "unknown", message: "the status page listed no resources" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const [index, resource] of resources.entries()) {
      const state = mapResourceStatus(resource.attributes?.status);
      components[resourceKey(resource, index)] = state === "ok"
        ? { state, message: resource.attributes?.public_name }
        : { state, message: `${resource.attributes?.public_name}: ${resource.attributes?.status}` };
    }

    const aggregate = body.data.attributes.aggregate_state;
    const affected = resources.filter((r) => mapResourceStatus(r.attributes?.status) !== "ok");
    const state = aggregate === undefined
      ? (affected.length === 0 ? "ok" : "degraded")
      : mapAggregateState(aggregate);

    return {
      state,
      message: affected.length === 0
        ? `all ${resources.length} components operational`
        : `${affected.length} affected: ${
          affected.map((r) => `${r.attributes?.public_name} (${r.attributes?.status})`).join(", ")
        }`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
