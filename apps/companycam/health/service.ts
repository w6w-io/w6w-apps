/**
 * Is CompanyCam up?
 *
 * ## The status page is real, and it covers the API. Checked four ways on 2026-08-11
 *
 * CompanyCam publishes at **`status.companycam.com`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes | md5 (first 12) |
 *   | -------------------------------------- | ------- | ----- | -------------- |
 *   | `/api/v2/summary.json`                 | 200     | 2,481 | `d1efae5b2129` |
 *   | `/api/v2/status.json`                  | 200     | 233   | `7f068ed89274` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —              |
 *
 * Three different answers, and the nonsense path is refused outright.
 *
 * **(b) Content-type AND body.** `application/json; charset=utf-8`, parsing as
 * the Statuspage v2 schema. Neither known unclaimed-host signature matches: an
 * unclaimed `*.statuspage.io` is ~127,700 B of HTML, an unclaimed
 * `*.instatus.com` is ~216,800 B. This is 2,481 B of JSON.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "y2vs4kl36flt", "name": "CompanyCam",
 *               "url": "https://status.companycam.com" }
 *
 * **(d) Does it say anything about the API?** Yes, and this is the part a
 * status page does not owe you. Its seven components include one named
 * **`API`** (id `n5595r721mdr`, created 2020-05-13) alongside `Web App`,
 * `Uploads & Processing`, `Search`, `Mobile App`, `Integrations` and
 * `Notifications`. A status page that only reported "Web App" would say nothing
 * about whether this app's calls work.
 *
 * `Uploads & Processing` earns its own mention: CompanyCam ingests a photo from
 * a URL asynchronously, so a photo created through this app can be accepted and
 * then never finish processing while that component is degraded, which is
 * invisible from the API's own responses.
 *
 * ## The host called, and why it is not in the app's allowlist
 *
 * This hook calls `status.companycam.com` and nothing else. That host is
 * declared in this check's own `network.allow`, not in `w6w.network.allow` —
 * the API host and the status host are different hosts, and a status page must
 * never be reachable from a signed request. The declaration is exact: the
 * allowlist does not follow redirects, and this URL does not redirect (measured
 * — a direct 200, no `location` header).
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. CompanyCam is SaaS-only
 * — there is no self-hosted install — so every connection this app can hold
 * runs on exactly the infrastructure this page describes, and an incident here
 * really is evidence about every tenant.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening above.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.companycam.com/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
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

/** The page-level roll-up: `none`, `minor`, `major`, `critical`, `maintenance`. */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/**
 * Key a component by the vendor's id, falling back to a slug of the name.
 *
 * The id is stable across renames and is what the page's own incident records
 * reference. The fallback exists only so a future page that drops ids still
 * reports something rather than silently dropping rows.
 */
export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    return `${
      component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "CompanyCam platform status",
  description: "Component status from status.companycam.com. Covers the API, Web App, Uploads & " +
    "Processing, Search, Mobile App, Integrations and Notifications.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.companycam.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about CompanyCam — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.companycam\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as CompanyCam's",
      };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children. CompanyCam publishes none today; the filter costs nothing and
    // stops a future grouping from double-counting.
    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which component this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
