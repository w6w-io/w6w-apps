/**
 * Is Process Street up? — Atlassian Statuspage.
 *
 * Verified live 2026-09-06: `https://status.process.st/api/v2/summary.json` returns
 * `page.name: "Process Street"` (genuinely claimed) with exactly two components:
 * `"Process Street Web Application"` (the app.process.st product UI, unrelated to this API) and
 * `"Process Street APIs"` — the one this check reports, since it names the API surface directly.
 *
 * Annotation:
 *
 *   - `kind: "service"` — a different question from "is this credential live" (the derived
 *     `auth:*` check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — one page, shared by every Connection.
 *   - `credential: "none"` (also the default) — unsigned, reports even before any Connection
 *     exists.
 *   - `network.allow` widens egress to the status host for this hook only; deliberately absent
 *     from the app's own `public-api.process.st` allowlist.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident never hard-fails a
 *     target on its own.
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

const STATUS_HOST = "status.process.st";
const COMPONENT_NAME = "Process Street APIs";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Process Street platform status",
  description:
    "Atlassian Statuspage rollup for status.process.st, scoped to the 'Process Street APIs' " +
    "component (distinct from the unrelated 'Process Street Web Application' component). " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string }>;
    };

    const api = body.components?.find((c) => c.name === COMPONENT_NAME);
    const state = api
      ? (COMPONENT[api.status ?? ""] ?? "unknown")
      : (INDICATOR[body.status?.indicator ?? ""] ?? "unknown");

    return {
      state,
      message: body.status?.description,
      components: api ? { api: { state } } : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
