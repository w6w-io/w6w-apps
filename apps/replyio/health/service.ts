/**
 * Is Reply.io up?
 *
 * ## The status page is real — checked three ways on 2026-09-01
 *
 * Reply publishes at **`status.reply.io`**, an Atlassian Statuspage.
 *
 * **(a) A tempting sibling is a decoy.** `reply.statuspage.io/api/v2/summary.json`
 * answers `200` with 127,695 bytes of HTML — the documented signature of an
 * **unclaimed** Statuspage subdomain (a claimed page answers JSON). This app
 * never uses it.
 *
 * **(b) Content-type AND body.** `status.reply.io/api/v2/summary.json` answers
 * `application/json; charset=utf-8`, 1,841 bytes, parsing as the Statuspage v2
 * schema.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "279mxqd36pgx", "name": "Reply", "url": "http://status.reply.io" }
 *
 * with 5 components: Reply Web Application, Reply API, Reply Company Website,
 * Chrome Extension, Integrations.
 *
 * ## The finding that shapes the code below
 *
 * **`status.reply.io` sits behind a Cloudflare rule that blocks requests
 * carrying no usable `User-Agent`.** Measured live on 2026-09-01: a request with
 * no `User-Agent` header, or with curl's own default (`curl/8.x`), or even with
 * a bare `Mozilla/5.0`, gets **403**; a request with almost any other explicit
 * `User-Agent` string (`w6w-apps/replyio`, `Deno/2.0`, …) gets **200** with the
 * real JSON body. This is not "browser vs script" — it targets specific known
 * default signatures. A host's default outbound fetch may or may not set a
 * `User-Agent`, so this check sets one explicitly rather than relying on it.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Reply is SaaS-only, so
 * an incident here is evidence about every Connection this app can hold.
 *
 * `credential: "none"` is explicit because it is the precondition for the
 * `network` widening below — a status host must never see a Reply API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.reply.io/api/v2/summary.json";

/**
 * Required to get past the Cloudflare rule described above. The value itself
 * is not meaningful to Reply — only its presence and non-default shape are.
 */
export const STATUS_USER_AGENT = "w6w-apps/replyio";

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

/** Key a component by the vendor's id, falling back to a slug of the name. */
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
  title: "Reply.io platform status",
  description: "Component status from status.reply.io: Reply Web Application, Reply API, Reply " +
    "Company Website, Chrome Extension, and Integrations.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.reply.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, {
      headers: { accept: "application/json", "user-agent": STATUS_USER_AGENT },
    });
    if (!res.ok) {
      // A broken status API says nothing about Reply — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.reply\.io(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Reply's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
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
