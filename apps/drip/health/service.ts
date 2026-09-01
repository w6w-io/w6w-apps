/**
 * Is Drip up? — a real, reachable Atlassian Statuspage that covers the API.
 *
 * Checked directly (2026-09-01), not inferred from a sibling app:
 *
 *   - `status.drip.com` resolves and serves a genuine Statuspage instance —
 *     `GET /api/v2/summary.json` returns `"page":{"name":"Drip","url":
 *     "https://status.drip.com"}`, and a nonsense sibling path
 *     (`/api/v2/definitely-not-real-zzz.json`) 404s, ruling out a catch-all.
 *   - Its component list names **"REST and JavaScript APIs"** explicitly —
 *     the exact surface this app calls — alongside "User Interface", "Email
 *     Sending", "New People Adds", "Workflows and Rules", "Support Systems"
 *     and "Analytics". This is not a marketing-only page; it covers the API.
 *
 * `status.indicator`/`status.description` is Drip's own roll-up; components
 * are carried as per-service detail. `network.allow` widens egress for this
 * hook only — `status.drip.com` is never added to the app's own allowlist,
 * since no signed action has business calling it (`credential: "none"`,
 * the `kind: "service"` default, is stated explicitly since it is the
 * precondition for that widening).
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.drip.com/api/v2/summary.json";
const STATUS_HOST = "status.drip.com";

/** Statuspage's documented page-level indicator vocabulary. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** Statuspage's documented per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Drip platform status",
  description:
    "Component status from status.drip.com, whose 'REST and JavaScript APIs' component covers " +
    "this app's own surface. Unauthenticated and unsigned.",
  kind: "service",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // A broken status API says nothing about Drip — never `down`.
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as {
      page?: { url?: string };
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    } | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect silently pointing this probe at
    // someone else's page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.drip\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Drip's" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    for (const c of body.components ?? []) {
      if (!c.name || c.group) continue; // group headers restate their children
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[slug(c.name)] = state === "ok" ? { state } : { state, message: c.status };
    }

    return {
      state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
