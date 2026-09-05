import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Is the WebinarJam / EverWebinar API up? — Atlassian Statuspage, verified
 * live 2026-09-05.
 *
 * `status.webinarjam.com/api/v2/summary.json` is a real, claimed Statuspage:
 * `page.name` is exactly `"WebinarJam"`, and its thirteen components are the
 * vendor's own — an `APP` group (`WebinarJam App`, `EverWebinar App`,
 * `Live Room`, `Email Sendout`, and a component literally named **`API`**)
 * plus an `INFRASTRUCTURE` group naming its own third-party dependencies
 * (SendGrid, Mailgun, Twilio SMS, Twilio Group Rooms, Firebase Realtime
 * Database).
 *
 * This check tracks the **`API`** component specifically — not `WebinarJam
 * App` / `EverWebinar App`, which are the end-user web dashboards this app
 * never touches — the same "developer API is a separate component from the
 * product UI" distinction `../../goto-webinar/health/service.ts` makes for
 * GoTo. The rest of the page is reported for context but does not decide
 * `state`.
 *
 * `credential: "none"` (default for `kind: "service"`) is stated explicitly
 * because it is the precondition for `network.allow` below — a status host
 * must never see the WebinarJam API key.
 */
export const STATUS_URL = "https://status.webinarjam.com/api/v2/summary.json";
const API_COMPONENT_NAME = "API";

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
function mapComponentStatus(status: string | undefined): HealthState {
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
function mapIndicator(indicator: string | undefined): HealthState {
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

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "WebinarJam / EverWebinar platform status",
  description:
    `Atlassian Statuspage rollup for status.webinarjam.com, tracking the "${API_COMPONENT_NAME}" ` +
    "component this app's actions actually call. Unauthenticated and unsigned.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.webinarjam.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // A broken status API says nothing about WebinarJam — never `down`.
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently repointing this probe at a
    // different, unrelated claimed status page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.webinarjam\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as WebinarJam's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    let apiState: HealthState | undefined;
    for (const [index, node] of nodes.entries()) {
      const state = mapComponentStatus(node.status);
      const key = node.id ?? `${slug(node.name ?? "")}-${index}`;
      components[key] = state === "ok" ? { state, message: node.name } : {
        state,
        message: `${node.name}: ${node.status}`,
      };
      if (node.name === API_COMPONENT_NAME) apiState = state;
    }

    const indicator = body.status?.indicator;
    // Prefer the named API component's own state over the page-wide rollup:
    // that rollup reflects the worst of THIRTEEN components, several of them
    // (Live Room, Email Sendout, the dashboards) unrelated to this app's
    // surface, and an incident on one of those must not report the developer
    // API as degraded.
    const state = apiState ?? mapIndicator(indicator);

    const notes: string[] = [];
    if (apiState === undefined) {
      notes.push(
        `"${API_COMPONENT_NAME}" component not found in status feed; falling back to page-wide rollup`,
      );
    }
    if (body.status?.description) notes.push(body.status.description);
    const openIncidents = body.incidents?.length ?? 0;
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    const maintenance = body.scheduled_maintenances?.length ?? 0;
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
