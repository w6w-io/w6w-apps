import type { HealthCheckDefinition } from "@w6w/types";
import { MONITORING_ROOT } from "../lib/client.ts";

/**
 * `GET /api/v1/monitoring/health` — the one Monitoring API endpoint that
 * needs no credential ("All Monitoring API endpoints require authentication,
 * except for the health check endpoint", `get-started/authentication.md`).
 * Answers `{"status": "healthy", "service": "monitoring-api", "version": …}`
 * per `HealthResponse` in the OpenAPI document.
 *
 * `kind: "dependency"` rather than `"service"`: this only proves the
 * Monitoring API surface itself is up, not the whole Base44 platform (Audit
 * Logs API, the app editor, or a published app) — `health/service.ts` is the
 * declared-absent whole-platform check.
 */
const check: HealthCheckDefinition = {
  key: "api",
  kind: "dependency",
  scope: "app",
  credential: "none",
  title: "Monitoring API reachable",
  description: "Probes the unauthenticated `GET /health` on the Monitoring API this app calls.",
  covers: [
    "action:get-analytics",
    "action:list-users",
    "action:get-user",
    "action:list-user-apps",
    "action:list-user-superagents",
    "action:list-apps",
    "action:get-app-analytics",
    "action:list-superagents",
    "action:get-superagent-analytics",
  ],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${MONITORING_ROOT}/health`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `could not reach ${MONITORING_ROOT}: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;

    if (res.status >= 500) {
      const text = await res.text().catch(() => "");
      return {
        state: "down",
        message: `Monitoring API returned ${res.status}: ${text.slice(0, 200)}`,
        latencyMs,
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `Monitoring API returned ${res.status}`, latencyMs };
    }

    const body = await res.json().catch(() => null) as { status?: string } | null;
    if (!body || body.status !== "healthy") {
      return {
        state: "unknown",
        message: "health endpoint returned an unexpected body",
        latencyMs,
      };
    }
    return { state: "ok", latencyMs, ttlSeconds: 60 };
  },
};

export default check;
