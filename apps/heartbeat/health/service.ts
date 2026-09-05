/**
 * Is Heartbeat up?
 *
 * ## The status page is real — checked three ways on 2026-09-05
 *
 * Heartbeat publishes at **`status.heartbeat.chat`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No: `/api/v2/summary.json`
 * answers 200 with 1,313 bytes of structured JSON; a nonsense path under the
 * same page answers 404. An unclaimed `*.statuspage.io` page (the decoy this
 * pack has hit before, e.g. Affinity's) is ~127,700 bytes of HTML — this is
 * neither that shape nor that size.
 *
 * **(b) Does the page describe THIS product?**
 *
 *     "page": { "id": "ccmqxzqxfb5n", "name": "Heartbeat",
 *               "url": "https://status.heartbeat.chat" }
 *
 * **(c) Two components, neither named "API".** `Heartbeat Communities` and
 * `Mobile Apps`. Heartbeat is a small vendor with one backend serving both the
 * web community product and this REST API — there is no separate "API"
 * component to point at, the way there is for e.g. Apify or GitHub. This
 * check reads `Heartbeat Communities` (the backend/web product) as the signal
 * for the API too, and drops `Mobile Apps` entirely: a native-app outage says
 * nothing about REST API availability, and including it would report this
 * app's own surface as degraded over a problem it cannot have.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Heartbeat is SaaS-only
 * — there is no self-hosted deployment — so an incident on the one component
 * this API shares infrastructure with really is evidence about every
 * Connection.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Heartbeat API key.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.heartbeat.chat/api/v2/summary.json";

/** The one component this check reads. See the module docs for why not "Mobile Apps". */
export const TRACKED_COMPONENT_NAME = "Heartbeat Communities";

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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Heartbeat platform status",
  description:
    `Reads the "${TRACKED_COMPONENT_NAME}" component from status.heartbeat.chat. Heartbeat has ` +
    "no separately-tracked API component — this backend serves both the web community product " +
    "and this REST API — so that component is the signal for both. The page's other component, " +
    "Mobile Apps, is dropped: a native-app outage says nothing about REST API availability.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.heartbeat.chat"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Heartbeat — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.heartbeat\.chat(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Heartbeat's" };
    }

    const tracked = (body.components ?? []).find(
      (c) => c?.name === TRACKED_COMPONENT_NAME && c.group !== true,
    );
    if (!tracked) {
      return {
        state: "unknown",
        message: `Status page carried no "${TRACKED_COMPONENT_NAME}" component`,
      };
    }

    const state = mapComponentStatus(tracked.status);
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (state !== "ok") notes.push(`${TRACKED_COMPONENT_NAME}: ${tracked.status}`);
    if (body.status?.description && state !== "ok") notes.push(body.status.description);
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: { [tracked.id ?? "heartbeat-communities"]: { state, message: tracked.name } },
      ttlSeconds: 60,
    };
  },
};

export default service;
