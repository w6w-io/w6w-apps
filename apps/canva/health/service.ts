/**
 * Is Canva up? — Atlassian Statuspage at canvastatus.com.
 *
 * Verified 2026-09-05: `https://www.canvastatus.com/api/v2/summary.json` is
 * a live Atlassian Statuspage endpoint (`page.name` is `"Canva"`) whose
 * component list includes one named exactly **"Connect API"** (group
 * "Apps", alongside "Admin API", "Apps SDK", "Canvas") — this check reads
 * that one component, not the page-wide indicator, since the page also
 * covers unrelated surfaces (mobile apps, billing, LMS integrations like
 * Moodle/Schoology) that say nothing about this app's API.
 *
 *   - `kind: "service"` — is the vendor's platform up, as distinct from the
 *     derived `auth:oauth2` check (is this credential live).
 *   - `scope: "app"` (default) — the answer is the same for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (default) — reports even before anyone connects.
 *   - `network.allow` widens egress to `www.canvastatus.com` for this one
 *     hook only, which the spec permits precisely because the posture is
 *     unsigned; the app's own `network.allow` stays `api.canva.com` only.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "www.canvastatus.com";
const COMPONENT_NAME = "Connect API";

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "Canva Connect API status",
  description:
    "Atlassian Statuspage rollup for canvastatus.com, scoped to the 'Connect API' component. " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  // Default for `kind: "service"`, stated explicitly because this hook
  // widens egress to the status host — that's only safe unsigned.
  credential: "none",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const component = (body.components ?? []).find((c) => c.name === COMPONENT_NAME);
    if (!component) {
      // The vendor renamed/removed the component this check anchors on —
      // safer to say so than to silently fall back to the page-wide
      // indicator, which would start covering unrelated Canva surfaces.
      return {
        state: "unknown",
        message: `no '${COMPONENT_NAME}' component in the status feed`,
      };
    }

    return {
      state: COMPONENT[component.status ?? ""] ?? "unknown",
      message: body.status?.description,
      ttlSeconds: 60,
    };
  },
};

export default service;
