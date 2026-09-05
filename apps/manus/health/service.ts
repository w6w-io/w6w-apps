/**
 * Is the Manus platform up?
 *
 * ## A real, claimed Statuspage instance
 *
 * `status.manus.im` is a CNAME onto an Atlassian Statuspage customer domain.
 * Verified three ways on 2026-09-05:
 *
 * **(a) It is a real, claimed page, not a catch-all.** A nonsense sibling path
 * answers 404:
 *
 *   | Path                                       | Status |
 *   | ------------------------------------------- | ------ |
 *   | `/api/v2/summary.json`                       | 200    |
 *   | `/api/v2/definitely-not-real-zzz.json`       | **404**|
 *
 * **(b) The page self-identifies as Manus**, not a generic placeholder:
 * `page.id` `sds4qb7v9tzy`, `page.name` `"Manus"`, `page.url`
 * `"https://status.manus.im"`. This matters because a decoy also exists —
 * `manus.statuspage.io` answers 200 with `page.name: "manus"` (lowercase) and
 * two components literally named `"API (example)"` / `"Management Portal
 * (example)"`, Statuspage's unconfigured defaults on an unclaimed page.
 *
 * **(c) Its three components are Manus's own**, not examples: `manus.im`
 * (the web app), `api.manus.im` (the API), `manus computer` (the sandboxed
 * environment a task's browser/code actions actually run in).
 *
 * ## Two of the three components are this app's business
 *
 * This app's entire surface is the v2 REST API — it never touches the web
 * app directly, so `manus.im` is excluded. But it tracks BOTH remaining
 * components, not just the literal API one: `manus computer` is the backend
 * that actually executes a created task's browser/code/computer actions
 * (the same reasoning this pack's `devin` app uses for Devin's "Cloud Agent"
 * component) — a task created through a perfectly healthy API can still
 * never progress if that execution backend is down. The page-level
 * `status.indicator` is deliberately NOT used as the verdict, since it would
 * fold the excluded web-app component into this app's answer.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"` — Manus runs entirely
 * on Manus's own cloud infrastructure with no self-hosted option, so every
 * Connection this app can hold depends on the components tracked here.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.manus.im/api/v2/summary.json";

/** The two components this app's task/agent/file/webhook surface actually depends on. */
export const TRACKED_COMPONENTS: Record<string, string> = {
  "r6pg5ktb00j5": "api.manus.im",
  "lplkkmm75tn3": "manus computer",
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
  title: "Manus platform status",
  description:
    "Component status from status.manus.im, scoped to the API and the task-execution ('manus " +
    "computer') components — not the web app this app never calls.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.manus.im"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Manus — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe
    // at someone else's page (or at the unclaimed `manus.statuspage.io` decoy).
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.manus\.im(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Manus's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.id && TRACKED_COMPONENTS[c.id]);
    if (nodes.length === 0) {
      return {
        state: "unknown",
        message: "Status page no longer lists the api.manus.im / manus computer components",
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
