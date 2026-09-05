/**
 * Is Pipefy up? — Atlassian Statuspage at `status.pipefy.com`.
 *
 * Verified as the REAL, claimed page, not the common decoy shape: its own
 * `page.name` reads `"Pipefy"` and `page.url` reads
 * `"https://status.pipefy.com/"`. The tempting alternative,
 * `pipefy.statuspage.io`, is the classic INACTIVE-page trap — it answers
 * `401 {"error":"Your page is inactive. Please include an API key to
 * access this resource."}` rather than real component data, so it is
 * explicitly not used here.
 *
 * Anchored on the `API (GraphQL)` component specifically (one of ~19
 * components on this page, alongside `Application`, `Billing`, `Webhooks`,
 * `AI Automation`, …) rather than the page-level rollup — this app only
 * ever calls the GraphQL API, so an outage in, say, `Billing` or `Mobile
 * App` should not report this app as down.
 *
 * Annotation:
 *
 *   - `kind: "service"` — a different question from "is this credential
 *     live" (the derived `auth:*` checks). No `quota` check ships: Pipefy
 *     publishes no rate-limit response header (confirmed on the wire against
 *     both an authenticated and unauthenticated GraphQL call) — only the
 *     query-complexity/depth/time limits described in its "Limits and Best
 *     Practices" guide, which aren't headroom a health check can read.
 *   - `scope: "app"` (this kind's default) — the rollup is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is required,
 *     so this reports even before anyone has connected.
 *   - `network.allow` — the status host is deliberately NOT on the app's
 *     runtime egress allowlist (only `api.pipefy.com` and `app.pipefy.com`
 *     are); the allowlist is widened for this one hook, which the spec
 *     permits precisely because the posture is unsigned.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** Statuspage's four rollup indicators. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const STATUS_HOST = "status.pipefy.com";
const API_COMPONENT_NAME = "API (GraphQL)";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Pipefy API status",
  description:
    "Atlassian Statuspage rollup for status.pipefy.com, anchored on the 'API (GraphQL)' " +
    "component rather than the page-level rollup. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about Pipefy, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    // A 200 carrying the wrong document is not health. Statuspage always
    // sends `status.indicator`; the inactive-page decoy and an HTML
    // catch-all will not, and `INDICATOR[undefined] ?? "unknown"` would
    // quietly report `unknown` forever instead of saying the probe broke.
    if (typeof body.status?.indicator !== "string") {
      return { state: "unknown", message: "status API returned no rollup indicator" };
    }

    const api = (body.components ?? []).find((c) => c.name === API_COMPONENT_NAME && !c.group);
    if (!api) {
      // The component vanished or was renamed — report the page rollup
      // rather than silently pinning `unknown` forever.
      return {
        state: INDICATOR[body.status.indicator] ?? "unknown",
        message: `"${API_COMPONENT_NAME}" component not found; reporting page rollup instead`,
      };
    }

    return {
      state: COMPONENT[api.status ?? ""] ?? "unknown",
      message: body.status.description,
      ttlSeconds: 60,
    };
  },
};

export default service;
