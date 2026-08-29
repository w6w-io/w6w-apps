/**
 * Is Apollo's hosted service up?
 *
 * ## Finding the real page, and why `apollo.statuspage.io` is a decoy
 *
 * Checked on 2026-08-29:
 *
 *  1. **`status.apollo.io/api/v2/summary.json`** (and `/status.json`, `/history.atom`) —
 *     all **301**. Statuspage-shaped paths do not exist at this host.
 *  2. **`apollo.statuspage.io/api/v2/summary.json`** — answers `200` with real-looking
 *     JSON (`page.name: "Apollo"`), but its first component is literally named
 *     `"API (example)"` and a second is `"Shard 1"` with description "Shard ID 1 of
 *     Apollo" — Statuspage's own placeholder demo content, still live under a claimed
 *     `apollo` subdomain nobody repointed. Trusting `page.name` alone here would report
 *     on a page that describes nothing real.
 *  3. **`status.apollo.io`** itself is a **Better Stack** page (its HTML loads
 *     `betterstack`-branded JS, and its title is "Better Stack"). Better Stack's own
 *     JSON document lives at **`/index.json`**, not any Statuspage-shaped path — that is
 *     why (1) 301s. It self-identifies unambiguously:
 *
 *         "company_name": "Apollo", "company_url": "https://www.apollo.io",
 *         "custom_domain": "status.apollo.io"
 *
 * ## No component is named for the REST API — this check is scoped, not full coverage
 *
 * The page's seven monitors are `app.apollo.io`, `www.apollo.io`, `Background Jobs
 * Latency`, `Email Sending Latency`, `Email Request Fulfillment Latency`, `Mobile Number
 * Fulfillment Latency` and `Payment Gateway`. None is named `api.apollo.io`. Per this
 * pack's rule ("a status page is not automatically a statement about the API"), that
 * would normally be a reason to skip the check entirely — but three of these seven are
 * directly load-bearing for actions this app ships: `people-enrich` and
 * `people-bulk-enrich` can request `run_waterfall_email`/`run_waterfall_phone`/
 * `reveal_phone_number`, which Apollo delivers **asynchronously to a webhook** rather
 * than in the synchronous response, and that delivery is exactly what "Background Jobs
 * Latency", "Email Request Fulfillment Latency" and "Mobile Number Fulfillment Latency"
 * monitor. So the check is kept, scoped to those three plus the two site monitors, with
 * `Payment Gateway` excluded from the verdict (billing, not data), and capped at
 * `informational` (see below) rather than trusted as a statement about
 * `api.apollo.io` request handling in general.
 *
 * ## Severity
 *
 * `informational`, not the `degraded` default for `kind: "service"`: the page's own
 * monitors are the web app and async delivery latency, not the REST API surface most of
 * this app's actions call synchronously, so a red monitor here is suggestive rather than
 * proof of an API-wide problem. The derived `auth:api-key` check is what actually
 * verifies this app's connections work.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated explicitly
 * because it is the precondition for the `network` widening below — a status host must
 * never see an Apollo API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.apollo.io/index.json";

/**
 * The monitors whose status actually informs this app: the two sites plus the three
 * async-delivery latencies that back `run_waterfall_email`/`reveal_phone_number`.
 * `Payment Gateway` is deliberately excluded — billing, not data.
 */
export const RELEVANT_MONITORS = new Set([
  "app.apollo.io",
  "www.apollo.io",
  "Background Jobs Latency",
  "Email Sending Latency",
  "Email Request Fulfillment Latency",
  "Mobile Number Fulfillment Latency",
]);

interface BetterStackResource {
  type?: string;
  attributes?: {
    public_name?: string;
    status?: string;
  };
}

interface BetterStackPage {
  data?: {
    attributes?: {
      company_name?: string;
      company_url?: string;
      custom_domain?: string;
      aggregate_state?: string;
    };
  };
  included?: BetterStackResource[];
}

/** Better Stack's documented status-page resource vocabulary. */
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

/** Slugify a monitor's public name into a stable component key. */
export function componentKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Apollo hosted status",
  description: "Monitor status from status.apollo.io (Better Stack): the web app and the async " +
    "email/phone delivery pipeline that backs waterfall enrichment. No monitor is named for " +
    "the REST API itself, so this is informational context, not a verdict on api.apollo.io.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.apollo.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    const attrs = body?.data?.attributes;
    if (!attrs) {
      return {
        state: "unknown",
        message: "Status page did not return its JSON document — /index.json may be gone",
      };
    }

    const identifies = /apollo/i.test(attrs.company_name ?? "") ||
      /apollo\.io/i.test(attrs.company_url ?? "") ||
      /apollo\.io/i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Apollo's" };
    }

    const monitors = (body?.included ?? [])
      .filter((r) =>
        r.type === "status_page_resource" && r.attributes?.public_name &&
        RELEVANT_MONITORS.has(r.attributes.public_name)
      );
    if (monitors.length === 0) {
      return { state: "unknown", message: "Status page returned none of the monitored resources" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const m of monitors) {
      const name = m.attributes!.public_name!;
      const state = mapResourceStatus(m.attributes?.status);
      components[componentKey(name)] = state === "ok"
        ? { state, message: name }
        : { state, message: `${name}: ${m.attributes?.status}` };
    }

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = monitors.filter((m) => mapResourceStatus(m.attributes?.status) !== "ok");
    const notes: string[] = [];
    if (attrs.aggregate_state) notes.push(`page aggregate: ${attrs.aggregate_state}`);
    if (affected.length > 0) {
      notes.push(
        `affected: ${
          affected.map((m) => `${m.attributes!.public_name} (${m.attributes?.status})`).join(", ")
        }`,
      );
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
