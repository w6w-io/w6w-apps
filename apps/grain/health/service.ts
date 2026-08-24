/**
 * Is Grain up? — Atlassian Statuspage, reached via `status.grain.com`, which
 * **301s to `www.grainstatus.com`** (verified 2026-08-24; the runtime
 * allowlists the URL passed here, not a redirect target, so the check calls
 * `www.grainstatus.com` directly rather than relying on the redirect).
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — a different question from "is this credential live"
 *     (the derived `auth:*` check) and "is there rate-limit headroom" (`quota`).
 *   - `scope: "app"` (this kind's default) — one worldwide API host, so the
 *     answer is identical for every Connection.
 *   - `credential: "none"` (also the default) — unauthenticated; reports even
 *     before anyone has connected.
 *   - `network.allow` — `www.grainstatus.com` is NOT on the app's own egress
 *     allowlist; widened for this hook only, which the spec permits precisely
 *     because the posture is unsigned.
 *   - `severity` defaults to `degraded`, so a vendor incident never hard-fails
 *     a target on its own.
 *
 * **Verified real, not assumed.** `https://www.grainstatus.com/api/v2/summary.json`
 * answers 200 JSON with `page.name: "Grain"` (page id `y13ml4pg4j8t`) and four
 * components (`Grain Desktop App`, `Recording Processing`, `Grain Recorder`,
 * `Grain Web App`); a deliberately bogus sibling path
 * (`/api/v2/nonsense-zzz.json`) answers **404 with an empty body**, confirming
 * this is a real Statuspage API rather than an HTML catch-all. Verified live
 * 2026-08-24.
 *
 * **Honest caveat**: none of the four components is named "API" or "Public
 * API" — this page tracks the desktop app, recorder, web app and the async
 * recording-processing pipeline this app's `ai_summary`/`ai_action_items`/
 * transcript reads depend on, not `api.grain.com` specifically. Reported
 * anyway (capped at `degraded`, never `down` outright from this page alone)
 * because a stalled Recording Processing pipeline is the most common reason
 * a perfectly-reachable API call returns an empty summary/transcript.
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

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "www.grainstatus.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Grain platform status",
  description:
    "Atlassian Statuspage rollup for www.grainstatus.com (status.grain.com redirects here), with " +
    "per-component detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      components[slug(c.name)] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
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
