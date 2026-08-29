import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Is Chatbase up?
 *
 * ## Chatbase publishes no usable third-party status page
 *
 * Checked three ways on 2026-08-29, each a dead end:
 *
 *  - `chatbase.statuspage.io/api/v2/summary.json` — **302s to
 *    `https://www.statuspage.io`**, the unclaimed-Statuspage decoy signature
 *    documented across this pack (a claimed page never redirects away from
 *    itself).
 *  - `status.chatbase.co` — resolves, but its TLS certificate **expired on
 *    2024-05-13** and the origin behind it answers `DEPLOYMENT_NOT_FOUND`
 *    (a stale Vercel project). Not a page worth trusting even with
 *    certificate verification disabled.
 *  - `www.chatbasestatus.com` and sibling guesses — do not resolve at all.
 *
 * So there is no out-of-band "is the vendor up" signal to declare, and
 * declaring `unavailable` here (per `HEALTHCHECKS.md`) would be true but
 * throw away a real, better signal that exists one call away.
 *
 * ## `GET /health` is that signal
 *
 * Documented at `/docs/api-v2/health/health-check`: "Returns the API health
 * status. No authentication required." It answers
 * `{"status": "ok", "timestamp": <unix seconds>}` per the OpenAPI schema —
 * the one v2 endpoint with `security: []`. This is Chatbase's own API
 * process reporting on itself, not a marketing status page, but it is the
 * best available "is the platform up" evidence Chatbase publishes, and it
 * needs no credential — so a bad or revoked API key never presents as an
 * outage here (that is `auth:api-key`'s job).
 *
 * Reachable over the same host (`www.chatbase.co`) already in this app's
 * `network.allow`, so no additional entry is declared.
 */
export const HEALTH_URL = `${API_BASE}/health`;

interface HealthBody {
  status?: string;
  timestamp?: number;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Chatbase API health",
  description:
    "Chatbase publishes no usable status page (its Statuspage instance is an unclaimed decoy " +
    "and status.chatbase.co is a dead, expired-certificate host) — this reads the API's own " +
    "unauthenticated GET /health instead, the best signal Chatbase publishes for whether the " +
    "platform is up.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(HEALTH_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `could not reach ${HEALTH_URL}: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;

    if (res.status >= 500) {
      return { state: "down", message: `Chatbase API returned ${res.status}`, latencyMs };
    }
    if (!res.ok) {
      return { state: "unknown", message: `Chatbase API returned ${res.status}`, latencyMs };
    }

    const body = await res.json().catch(() => null) as HealthBody | null;
    if (!body || body.status !== "ok") {
      return {
        state: "unknown",
        message: `/health answered 200 with an unexpected body: ${JSON.stringify(body)}`,
        latencyMs,
      };
    }

    return { state: "ok", message: `healthy, ${latencyMs}ms`, latencyMs, ttlSeconds: 60 };
  },
};

export default service;
