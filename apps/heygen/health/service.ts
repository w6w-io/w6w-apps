/**
 * Is HeyGen up?
 *
 * ## The status page is real. Checked three ways on 2026-08-24
 *
 * HeyGen publishes at **`status.heygen.com`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes | Content type |
 *   | --------------------------------------- | ------- | ----- | ------------------------- |
 *   | `/api/v2/summary.json`                  | 200     | 1,717 | `application/json`        |
 *   | `/api/v2/definitely-not-real-zzz.json`  | **404** | **0** | —                          |
 *
 * A nonsense path is refused outright, which is not what an unclaimed Statuspage instance does
 * (those serve ~127,700 bytes of HTML for every path, including nonsense ones).
 *
 * **(b) Does the page describe HeyGen?** Yes:
 *
 *     "page": {"id": "01H1NMXHPTVBJ27HJPPZH3DD55", "name": "HeyGen", "url": "https://status.heygen.com/"}
 *
 * **(c) Does a component cover the API this app actually calls?** Yes — one of the six named
 * components is literally `https://api.heygen.com` (id `01H1NMXJ68PP0R48RA72768THS`), "The HeyGen
 * API". The other five (`https://www.heygen.com`, `https://app.heygen.com`, and the LiveAvatar
 * home/API/app trio) are different products or surfaces this app never calls — LiveAvatar is a
 * separate real-time streaming product with its own docs host — so they are still reported (an
 * incident there is real information) but the API component is what the check leads with.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Every Connection this app can hold runs
 * against exactly this hosted API — there is no self-hosted HeyGen — so an incident here really is
 * evidence about every tenant.
 *
 * `credential: "none"` is the default for `kind: "service"`, stated explicitly because it is the
 * precondition for the `network` widening below — a status host must never see an API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.heygen.com/api/v2/summary.json";

/** The component id for `https://api.heygen.com`, "The HeyGen API" — the surface this app calls. */
export const API_COMPONENT_ID = "01H1NMXJ68PP0R48RA72768THS";

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
 * Statuspage's documented component vocabulary: `operational`, `degraded_performance`,
 * `partial_outage`, `major_outage`, `under_maintenance`.
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "HeyGen platform status",
  description:
    "Component status from status.heygen.com, led by the 'https://api.heygen.com' component " +
    "this app actually calls. The www/app/LiveAvatar components are different surfaces but are " +
    "still reported.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.heygen.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about HeyGen — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at someone else's
    // page — the failure mode where a healthy, claimed status page belongs to a different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.heygen\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as HeyGen's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }
    if (!nodes.some((n) => n.id === API_COMPONENT_ID)) {
      return { state: "unknown", message: "Status page no longer lists the HeyGen API component" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const key = node.id ?? node.name!;
      const state = mapComponentStatus(node.status);
      components[key] = state === "ok" ? { state, message: node.name } : {
        state,
        message: `${node.name}: ${node.status}`,
      };
    }

    const apiState = components[API_COMPONENT_ID]?.state ?? "unknown";
    // The other five components are different products (the marketing site, the app, and the
    // separate LiveAvatar streaming product) — an outage confined to them is real information,
    // reported below, but must not read as THIS app being down. Capped at `degraded` rather than
    // dropped: HeyGen's own page-level indicator (see `notes`) may still be tracking something
    // that a components-only reading misses.
    const othersWorst = worstHealthState(
      Object.entries(components).filter(([id]) => id !== API_COMPONENT_ID).map(([, c]) => c.state),
    );
    const othersCapped: HealthState = othersWorst === "down" ? "degraded" : othersWorst;
    const state = worstHealthState([apiState, othersCapped]);

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
