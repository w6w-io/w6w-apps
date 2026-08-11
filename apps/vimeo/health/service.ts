import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * Is Vimeo up?
 *
 * ## The status page is real, and it is NOT on the host you would guess
 *
 * This is the finding worth reading before changing anything here. Vimeo's
 * status page is an Atlassian Statuspage whose **canonical host is
 * `www.vimeostatus.com`**. The obvious guess, `status.vimeo.com`, answers a
 * `301 Moved Permanently` to `https://www.vimeostatus.com/api/v2/status.json`
 * (measured 2026-08-11) — served by Cloudflare, with an HTML body, not JSON.
 *
 * That matters more here than it would in a browser. A health check's egress is
 * restricted to the hosts it declares in `network.allow`, and a redirect
 * crosses to a *different* host. Declaring `status.vimeo.com` and following the
 * redirect would either be blocked outright or, worse, silently parse the
 * Cloudflare interstitial as a status document. So this check calls the
 * canonical host directly and allowlists exactly that one host. If a future
 * reader "fixes" the URL back to `status.vimeo.com`, this comment is why they
 * should not.
 *
 * ## Verified three ways on 2026-08-11
 *
 * **(a) It is a real Statuspage, not a catch-all.**
 * `GET https://www.vimeostatus.com/api/v2/status.json` returns 200 with the
 * two-key `{page, status}` document, and `/api/v2/summary.json` returns 200
 * with 5,670 bytes carrying `page`, `status`, `components`, `incidents` and
 * `scheduled_maintenances`. Two different paths, two different documents.
 * Neither known unclaimed-host signature matches: an unclaimed
 * `*.statuspage.io` is ~127,700 bytes of HTML, an unclaimed `*.instatus.com`
 * ~216,800 bytes.
 *
 * **(b) The page describes THIS product.**
 *
 *     "page": { "id": "sccqh0pnqrh8",
 *               "name": "Vimeo",
 *               "url": "https://www.vimeostatus.com" }
 *
 * **(c) The components are Vimeo's own** — 16 of them, each with a distinct id
 * and a distinct name: Website, Billing, On-Site Player, Embedded Player,
 * Upload, Create, Conversion, **API**, Mobile/TV Apps, Live Analytics, Support
 * Systems, Live streaming features, VOD Analytics, Record, Editor, Interactive.
 *
 * `summary.json` is read rather than `status.json` because it costs the same
 * request and carries the per-component breakdown — the difference between
 * "Vimeo is up" and "the API is fine, Upload is degraded", which for this app
 * is precisely the distinction that matters.
 *
 * ## Severity and posture
 *
 * Left at the `degraded` default for `kind: "service"`. Vimeo is SaaS-only —
 * there is no self-hosted Vimeo — so every Connection this app can hold runs on
 * exactly the infrastructure this page describes, and an incident here really
 * is evidence about every tenant.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for widening egress: a third-party
 * status host must never see a Vimeo access token. The status host is declared
 * on this hook, deliberately **not** in the app's `w6w.network.allow`.
 */

export const STATUS_HOST = "www.vimeostatus.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

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
 * All 16 live components have both a unique id and a unique name today, so
 * either would work — the id is used because it is the stable one: Vimeo
 * renames components (the live page carries "Mobile/ TV Apps", stray space and
 * all) far more readily than it reissues ids.
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
  title: "Vimeo platform status",
  description:
    "Component status from www.vimeostatus.com, Vimeo's Atlassian Statuspage. Reports all 16 " +
    "published components, including API, Upload and Conversion — the three this app depends on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Vimeo — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page — a healthy, claimed status page belonging to an
    // entirely different product is the failure mode that reads as success.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)vimeostatus\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Vimeo's" };
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
