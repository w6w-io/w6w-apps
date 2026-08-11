/**
 * Is Paddle up?
 *
 * ## The status page is real. It was checked three ways on 2026-08-10
 *
 * Paddle publishes at **`paddlestatus.com`** — the host its own error
 * documentation links by name ("check our status page"). It is an
 * **incident.io** page serving a Statuspage-v2-compatible API, not an Atlassian
 * one, which matters only in that the response has no `incidents` key at all
 * when nothing is open (see below).
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes | md5 (first 12) |
 *   | -------------------------------------- | ------- | ----- | -------------- |
 *   | `/api/v2/summary.json`                 | 200     | 6,523 | `1e886c148ec8` |
 *   | `/api/v2/status.json`                  | 200     | 201   | `d4d8956949b2` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —              |
 *
 * Three different answers, and the nonsense path is refused outright.
 *
 * **(b) Content-type AND body.** `application/json`, parsing as the Statuspage
 * v2 schema. Neither known unclaimed-host signature matches: an unclaimed
 * `*.statuspage.io` is ~127,700 B of HTML, an unclaimed `*.instatus.com` is
 * ~216,800 B. This is 6,523 B of JSON.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "01K33AAG63VDSYC4PWDAKA31Z5",
 *               "name": "Paddle",
 *               "url": "https://paddlestatus.com/" }
 *
 * and its components are Paddle's own, split by environment and by API
 * generation — `Production - Billing`, `Sandbox - Billing`,
 * `Production - Classic`, `Sandbox - Classic`.
 *
 * ## Two findings that shape the code below
 *
 * **Component names are not unique.** The page has 25 components and only about
 * eight distinct names, because it is a grid: each service (API, Checkout,
 * Webhooks, …) publishes one component per environment, and the JSON carries no
 * group field to tell them apart — three separate components are all literally
 * named `Production - Billing`. Slugifying the name as a component key, which
 * is what the sibling `metabase` and `discourse` checks do, would collapse 25
 * components into 8 and let one healthy row overwrite a broken one. This check
 * keys by the vendor's own component **id** and carries the name in the message
 * instead.
 *
 * **There is no `incidents` key.** The live summary returns exactly `page`,
 * `status`, `components` and `scheduled_maintenances` — incident.io omits
 * `incidents` entirely rather than sending `[]`. Reading `body.incidents.length`
 * would throw; every access here is optional.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"` — deliberately, and
 * unlike `apps/metabase`, whose status page only covers its *hosted* offering.
 * Paddle is SaaS-only: there is no self-hosted Paddle, so every Connection this
 * app can hold runs on exactly the infrastructure this page describes. An
 * incident here really is evidence about every tenant.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a third-party status host must never see a Paddle API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://paddlestatus.com/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
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
 * The id is used because the names collide — see the module docs. The fallback
 * exists only so a future page that drops ids still reports something rather
 * than silently dropping rows.
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
  title: "Paddle platform status",
  description:
    "Component status from paddlestatus.com, the status page Paddle's own error documentation " +
    "links. Covers both environments (Production and Sandbox) and both API generations (Billing " +
    "and Classic).",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["paddlestatus.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Paddle — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)paddlestatus\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Paddle's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which of the three
      // identically-named `Production - Billing` rows this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    // `incidents` is absent entirely on this page when nothing is open — not
    // `[]`. Every access is optional for that reason.
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
