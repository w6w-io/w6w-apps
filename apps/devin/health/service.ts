/**
 * Is Devin's session-execution platform up?
 *
 * ## The status page is real, and it is not at the obvious URL
 *
 * `status.devin.ai` and `status.cognition.ai` both redirect (permanently, via
 * an HTML meta-redirect page) to **`www.devinstatus.com`**, an Atlassian
 * Statuspage instance. Verified three ways on 2026-09-05:
 *
 * **(a) It is a real, claimed page, not a catch-all.** A nonsense sibling path
 * answers 404:
 *
 *   | Path                                        | Status |
 *   | -------------------------------------------- | ------ |
 *   | `/api/v2/summary.json`                        | 200    |
 *   | `/api/v2/definitely-not-real-zzz.json`        | **404**|
 *
 * **(b) The page self-identifies as Devin.** `page.id` `6bjrw54df4rj`,
 * `page.name` `"Devin"`, `page.url` `"https://www.devinstatus.com"`.
 *
 * **(c) Its components are Devin's own.** Ten components: Cloud Web Client
 * (+ Enterprise), Cloud Agent (+ Enterprise), Desktop Agent (+ Enterprise),
 * Desktop Tab (+ Enterprise), Integrations, and a `group: true` "Enterprise"
 * roll-up container.
 *
 * ## Only two of the ten components are this app's business
 *
 * This app's entire surface is the v3 session/message/attachment/secret API —
 * it never touches the web app, the desktop client, or IDE integrations. The
 * component descriptions say which one is the session-execution backend:
 * **Cloud Agent (Enterprise)** is documented as "Session creation and
 * management, reasoning, and inference for enterprise clients" — exactly this
 * app's `/v3/organizations/{org_id}/sessions*` surface — and **Cloud Agent**
 * is its non-enterprise sibling, present for the same reason since v3 also
 * serves non-Enterprise organizations. `Cloud Web Client`, `Desktop Agent`,
 * `Desktop Tab` and `Integrations` are the browser app, the desktop client,
 * IDE plugins and chat-platform bridges (Slack/Teams/Linear/Jira) — none of
 * them is reachable from this app and an outage in one says nothing about
 * whether `POST /v3/organizations/{org_id}/sessions` will work.
 *
 * The page-level `status.indicator` is deliberately NOT used as the verdict
 * for the same reason: it rolls up all ten components, so a Desktop Tab outage
 * would report this app's actual dependency as down.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"` — Devin sessions run on
 * Cognition's own cloud infrastructure with no self-hosted option, so every
 * Connection this app can hold depends on exactly the component tracked here.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://www.devinstatus.com/api/v2/summary.json";

/** The two components this app's session/message/attachment/secret surface actually depends on. */
export const TRACKED_COMPONENTS: Record<string, string> = {
  "q72cy1kjpk4r": "Cloud Agent",
  "c20stk646s0v": "Cloud Agent (Enterprise)",
};

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
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
  title: "Devin platform status",
  description:
    "Component status from www.devinstatus.com, scoped to the Cloud Agent components that back " +
    "the v3 session API — not the web app, desktop client, or IDE integrations this app never " +
    "calls.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["www.devinstatus.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Devin — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)devinstatus\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Devin's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.id && TRACKED_COMPONENTS[c.id]);
    if (nodes.length === 0) {
      return {
        state: "unknown",
        message: "Status page no longer lists the Cloud Agent components",
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      const name = TRACKED_COMPONENTS[node.id!];
      components[node.id!] = state === "ok"
        ? { state, message: name }
        : { state, message: `${name}: ${node.status}` };
    }

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;

    const notes: string[] = [];
    if (affected.length > 0) {
      notes.push(
        `affected: ${affected.map((n) => `${TRACKED_COMPONENTS[n.id!]} (${n.status})`).join(", ")}`,
      );
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s) on the page`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
