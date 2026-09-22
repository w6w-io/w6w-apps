import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is the Brex developer API up?
 *
 * ## The status page is real, and it has a component for this API
 *
 * `https://status.brex.com` is an Atlassian Statuspage. Read 2026-09-22:
 * `GET /api/v2/summary.json` → `200`, `page.name` = `"Brex"`, `page.url` =
 * `https://status.brex.com`, 11 components and no groups. The page's own
 * component list is:
 *
 *     Partner API, Money movement: card authorization, Dashboard, Mobile,
 *     Spend Management, Authentication, Partner Integrations, Brex Travel,
 *     Bill Pay, Home Page, Banking
 *
 * **"Partner API" is the one that covers this app.** Every call this app makes
 * goes to `api.brex.com`, which is the developer API — a dashboard, mobile,
 * travel or bill-pay incident that leaves it healthy is not this app's problem.
 * So the verdict here is that component alone and the other 10 are reported as
 * `components` detail rather than rolled into the answer. (The component's id
 * was `mjm37m197f3v` when read; it is not matched, because ids change when a
 * component is recreated and this app should not have to be redeployed when
 * they do.)
 *
 * ## Severity
 *
 * `informational`: a vendor incident is evidence, not a verdict on a given
 * workflow — the outage this page reports may fall entirely outside the subset
 * of the API one connection uses, and Brex's own API is large enough that
 * "Partner API degraded" does not tell you which of the 23 actions here is
 * affected. `credential: "none"` is the default for this kind and is the
 * precondition for the `network` widening below: a status host must never see a
 * Brex token, and this hook is never given one.
 */
export const STATUS_URL = "https://status.brex.com/api/v2/summary.json";

/** The status host, reachable only inside this hook's worker. */
export const STATUS_HOST = "status.brex.com";

/** The one component this app's verdict follows. Anchored — not a substring. */
export const API_COMPONENT = /^partner api$/i;

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatuspageSummary {
  page?: { id?: string; name?: string; url?: string };
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
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

/** A stable key for a reported component. */
export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Brex Partner API status",
  description:
    "The `Partner API` component of Brex's status page (status.brex.com), which is the developer " +
    "API this app calls at api.brex.com. The page's other components (Dashboard, Mobile, Spend " +
    "Management, Authentication, Partner Integrations, Brex Travel, Bill Pay, Home Page, Banking, " +
    "Money movement: card authorization) are different products and are reported as detail only.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    if (!res.ok) {
      await res.body?.cancel();
      // A broken status page says nothing about Brex — never `down`.
      return { state: "unknown", message: `the status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.components) {
      return { state: "unknown", message: "the status page did not return its components" };
    }
    if (!/brex/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message: "the status page no longer self-identifies as Brex's",
      };
    }

    // Every non-group component, as detail. The verdict comes from `Partner API` alone.
    const components: Record<string, HealthComponentReport> = {};
    for (const [index, component] of body.components.entries()) {
      const name = (component.name ?? "").trim();
      if (!name || component.group === true) continue;
      const state = mapComponentStatus(component.status);
      components[slug(name) || `component-${index}`] = state === "ok"
        ? { state }
        : { state, message: component.status };
    }

    const api = body.components.find(
      (component) => component.group !== true && API_COMPONENT.test((component.name ?? "").trim()),
    );
    if (!api) {
      // The page is Brex's but the component this app follows is gone — renamed,
      // or the developer API was folded into another one. Saying so beats
      // reporting the page-wide roll-up as if it answered for api.brex.com.
      return {
        state: "unknown",
        message: 'the status page has no component named "Partner API"',
        components,
      };
    }

    const state = mapComponentStatus(api.status);
    return {
      state,
      message: state === "ok"
        ? `${api.name} operational`
        : `${api.name}: ${api.status ?? "status not reported"}`,
      components,
      ttlSeconds: 300,
    };
  },
};

export default service;
