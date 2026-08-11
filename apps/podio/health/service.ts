/**
 * Is Podio up?
 *
 * ## The status page is real. It was checked four ways on 2026-08-11
 *
 * Podio publishes at **`status.podio.com`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes | content-type       |
 *   | -------------------------------------- | ------- | ----- | ------------------ |
 *   | `/api/v2/summary.json`                 | 200     | 1,861 | `application/json` |
 *   | `/api/v2/status.json`                  | 200     | 236   | `application/json` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —                  |
 *
 * Three different answers, and the nonsense path is refused outright.
 *
 * **(b) No redirect.** `curl -w %{redirect_url}` on the summary URL returns
 * `200` with an empty redirect target — the runtime allowlists the host that is
 * *asked*, not whatever a 302 points at, so this had to be confirmed rather
 * than assumed.
 *
 * **(c) Content-type AND body.** `application/json; charset=utf-8`, parsing as
 * the Statuspage v2 schema. Neither known unclaimed-host signature matches: an
 * unclaimed `*.statuspage.io` is ~127,700 B of HTML, an unclaimed
 * `*.instatus.com` ~216,800 B. This is 1,861 B of JSON.
 *
 * **(d) Does the page describe THIS product, and does it cover the API?** Yes,
 * to both — and the second half is the one that is usually missing:
 *
 *     "page": { "id": "p556j9m0x9q8", "name": "Podio Status Page",
 *               "url": "https://status.podio.com" }
 *
 * with five components, of which one is literally **`API`**
 * (`xclqkr4s5kyn`), alongside `Web`, `Email`, `Advanced Workflow Automation`
 * and `Advanced Workflow Automation Failover Queue`. A status page that only
 * reported "Web" would say nothing about the surface this app uses.
 *
 * ## Two decisions this shapes
 *
 * **The page-level indicator is the verdict; components are the detail.**
 * `status.indicator` is Podio's own roll-up across all five and is the field to
 * trust. Deriving a verdict from the component list would let the failover
 * queue — an internal implementation detail of a feature this app does not
 * touch — report Podio as down.
 *
 * **`covers` stays `["*"]` rather than being narrowed to the API component.**
 * The roll-up is what the state comes from, so claiming to speak only for the
 * API would misdescribe the reading. The per-component breakdown is reported
 * separately, which is where a reader can see that `API` specifically is fine
 * while something else is not.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Podio is SaaS-only, so
 * every Connection this app can hold runs on exactly the infrastructure this
 * page describes, and an incident here really is evidence about every tenant.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Podio token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.podio.com/api/v2/summary.json";

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
  title: "Podio platform status",
  description:
    "Component status from status.podio.com. Covers the API, the web app, email, and the " +
    "two Advanced Workflow Automation components.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.podio.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Podio — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.podio\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Podio's" };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children. Podio's page has none today, but a page that grows one should
    // not start double-counting.
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
