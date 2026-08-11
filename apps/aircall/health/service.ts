/**
 * Is Aircall up?
 *
 * ## Which host — this is the whole finding
 *
 * Aircall's status page answers on **two** names, and only one of them is safe
 * to declare. Measured 2026-08-11:
 *
 *   | Request                                          | Result                                    |
 *   | ------------------------------------------------ | ----------------------------------------- |
 *   | `GET https://status.aircall.io/api/v2/summary.json` | **301** → `https://status.aircall.com/...` |
 *   | `GET https://status.aircall.com/api/v2/summary.json` | **200**, 17,124 B, 0 redirects            |
 *
 * Both eventually serve the identical document (md5 `e3871743666d504c44`), and
 * the page self-identifies as `"url": "https://status.aircall.com"` — the vendor
 * considers `.com` canonical even though the product's API and marketing live
 * on `.io`.
 *
 * A health check may only reach hosts it declares, and the runtime does not
 * follow a redirect out through the allowlist. So declaring `status.aircall.io`
 * — the name that matches the app, and the one a reader would write from memory
 * — yields a check that fails on the 301 with nothing useful to report. This
 * check declares and calls **`status.aircall.com`**, the host that answers
 * directly, and calls it consistently in one exported constant so the two can
 * never drift apart.
 *
 * ## The page is real. Checked three ways on 2026-08-11
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 * `GET /api/v2/definitely-not-real-zzz.json` answers **404 with 0 bytes**, where
 * `summary.json` answers 200 with 17,124 B and `status.json` answers 200 with
 * 214 B — three distinct answers, and the nonsense path is refused outright.
 *
 * **(b) Content-type AND body.** `application/json; charset=utf-8`, parsing as
 * the Statuspage v2 schema. Neither known unclaimed-host signature matches: an
 * unclaimed `*.statuspage.io` is ~127,700 B of HTML, an unclaimed
 * `*.instatus.com` ~216,800 B. This is 17,124 B of JSON.
 *
 * **(c) Does the page describe THIS product, and specifically the API?** Yes —
 * and the second half of that question is the one that is usually skipped. The
 * page block reads `{"id": "glgfnjclpmlj", "name": "Aircall", "url":
 * "https://status.aircall.com"}`, and among its 50 components is
 * **`API & Webhooks`** (id `fgncjccmmjnf`) inside the `Integrations & APIs`
 * group. So this feed is a statement about the surface this app actually calls,
 * not merely about the telephony product — the distinction that makes a status
 * check worth running at all.
 *
 * ## Two things that shape the code below
 *
 * **Nine of the fifty components are groups.** Statuspage `group: true` rows
 * (`Voice — Calling`, `Messaging`, `AI Assist`, `AI Agents`, `Aircall Apps`,
 * `Aircall Dashboard`, `Integrations & APIs`, `Authentication`, `Websites`)
 * merely mirror their children's worst state. Reporting them would double-count
 * every service.
 *
 * **The page-level indicator is the verdict, components are the detail.**
 * `status.indicator` is Aircall's own roll-up across all 50; deriving a verdict
 * from the component list instead would report Aircall down because the
 * `Aircall Status Page` component (yes, it monitors itself) or the Hubspot
 * integration is having a bad day.
 *
 * ## Severity and posture
 *
 * Left at the `degraded` default for `kind: "service"`. Aircall is SaaS-only —
 * there is no self-hosted Aircall — so every Connection this app can hold runs
 * on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below: a
 * status host must never see an Aircall API token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * The canonical status host. `status.aircall.io` 301s here; see the module
 * comment for why that matters more than it looks.
 */
export const STATUS_HOST = "status.aircall.com";

export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

/** The component that speaks for the surface this app calls. */
export const API_COMPONENT_ID = "fgncjccmmjnf";

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
    const slug = component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${slug}-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Aircall platform status",
  description:
    "Component status from status.aircall.com. Covers `API & Webhooks` — the surface this app " +
    "calls — plus inbound/outbound calling, messaging, the Dashboard, Workspace apps, AI Assist " +
    "and the CRM integrations, across 50 components.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Aircall — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product. Matched on the `.com` form
    // because that is what the page publishes as its own canonical URL.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.aircall\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Aircall's" };
    }

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
    // Called out by name rather than left in the crowd: an incident on this one
    // component is the one that explains why this app's own calls are failing.
    const api = nodes.find((n) => n.id === API_COMPONENT_ID);
    if (api && mapComponentStatus(api.status) !== "ok") {
      notes.push(`the API this app calls is affected (${api.name}: ${api.status})`);
    }
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
