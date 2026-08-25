/**
 * Is SignNow up? — Atlassian Statuspage, `status.signnow.com`.
 *
 * `kind: "service"`, `scope: "app"` (default — the answer is the same for
 * every Connection), `credential: "none"` (default — unsigned, runs before
 * anyone has connected).
 *
 * ## The page is real, and that was checked rather than assumed
 *
 * A Statuspage-shaped URL is not evidence of a Statuspage. Verified live
 * 2026-08-25:
 *
 * ```
 * GET status.signnow.com/api/v2/summary.json -> 200 application/json, 2122 bytes
 *   page: { "id": "7z3359qf8bjw", "name": "signNow", "url": "https://status.signnow.com" }
 *   components: Web, Mobile apps, API, Integrations, Payments, Support
 * ```
 *
 * A component literally named **API** exists — unlike several other vendors
 * in this pack whose status pages roll up unrelated products, SignNow's is
 * already scoped to what this App calls. `network.allow` is widened for this
 * one hook only (unsigned posture); `status.signnow.com` is not on the app's
 * own egress allowlist because no action has any business calling it.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.signnow.com";
const API_COMPONENT = "api";

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

/** Statuspage's four rollup indicators — used only as a fallback. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Component {
  name?: string;
  status?: string;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "SignNow platform status",
  description:
    "Atlassian Statuspage for status.signnow.com, narrowed to the API component. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Component[];
    };

    const api = (body.components ?? []).find((c) => slug(c.name ?? "") === API_COMPONENT);
    if (!api) {
      const rollup = INDICATOR[body.status?.indicator ?? ""] ?? "unknown";
      return {
        state: rollup,
        message: body.status?.description ??
          "no API component found on status.signnow.com; reporting the page-wide rollup",
        ttlSeconds: 60,
      };
    }

    const state = COMPONENT[api.status ?? ""] ?? "unknown";
    return {
      state,
      message: `API: ${api.status ?? "unknown"}` +
        (body.status?.description ? ` · page-wide: ${body.status.description}` : ""),
      components: { api: { state } },
      ttlSeconds: 60,
    };
  },
};

export default service;
