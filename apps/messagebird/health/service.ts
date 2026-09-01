/**
 * Is MessageBird (Bird) up? — Atlassian Statuspage, scoped to the two
 * components this app actually calls.
 *
 * The rebrand moved the status page: `status.messagebird.com` now 301s to
 * `status.bird.com` (page name "Bird"), confirmed live 2026-09-01. Bird's
 * status page is huge — Dashboard, CRM, Payments, AI Hub, per-region
 * Connectivity components and more — because it covers the whole Bird
 * platform, not just this classic REST API. Rolling up the WHOLE page would
 * report outages in products this app never touches, so this check reads
 * only the two components whose own `description` names this app's surface:
 *
 *   - "SMS - API"   → description "https://rest.messagebird.com" (exactly
 *                      this app's `network.allow` host — covers send-sms,
 *                      message-get, message-list, verify-*, lookup-number)
 *   - "Voice - API" → covers voice-message-send
 *
 * ("SMS - API V1" is a DIFFERENT host, `api.messagebird.com`, not called by
 * this app, and "Messaging - API" is Bird's newer unified messaging product —
 * neither is included.)
 *
 * Annotation:
 *   - `kind: "service"`, `scope: "app"` (default) — one shared answer.
 *   - `credential: "none"` (default) — unauthenticated, reports before connect.
 *   - `network.allow` — status.bird.com is NOT on the app's egress allowlist;
 *     widened for this hook only, permitted because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const RELEVANT = new Set(["SMS - API", "Voice - API"]);
const STATUS_HOST = "status.bird.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "MessageBird (Bird) platform status",
  description:
    "Atlassian Statuspage rollup for status.bird.com, scoped to the SMS API and Voice API components. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  credential: "none",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      if (!c.name || c.group || !RELEVANT.has(c.name)) continue;
      const key = c.name === "SMS - API" ? "sms-api" : "voice-api";
      components[key] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    if (Object.keys(components).length === 0) {
      // The page reshuffled its component names — fall back to the page-level
      // indicator rather than reporting nothing.
      return {
        state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
        message: `SMS API / Voice API components not found on the status page${
          body.status?.description ? ` (page reports: ${body.status.description})` : ""
        }`,
      };
    }

    const worst = Object.values(components).reduce<HealthState>((acc, c) => {
      const rank: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
      return rank[c.state] > rank[acc] ? c.state : acc;
    }, "ok");

    return { state: worst, components, ttlSeconds: 60 };
  },
};

export default service;
