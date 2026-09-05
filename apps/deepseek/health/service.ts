/**
 * Is DeepSeek up? — Atlassian Statuspage at deepseek.statuspage.io.
 *
 * This is genuinely DeepSeek's own page — `page.name` is "DeepSeek Service"
 * and its two components describe `https://api.deepseek.com` and
 * `https://chat.deepseek.com` by name in both Chinese and English (not the
 * generic "API (example)" defaults an unclaimed Statuspage decoy carries),
 * and `/api/v2/incidents.json` shows 50 real, resolved incidents with the
 * newest dated 2026-05-08 — active well into this app's research window, not
 * an abandoned page frozen years ago.
 *
 * It is worth being explicit about what this is NOT: deepseek.com's own
 * marketing site links a DIFFERENT, newer page at `status.deepseek.com`
 * (a Next.js SPA on the `flashcat.cloud` status-page product). That page has
 * no usable machine-readable surface — every JSON-shaped path tried
 * (`/api/v2/summary.json`, `/api/v2/status.json`, `/index.json`) answers 200
 * with the identical ~120KB SPA shell, the classic catch-all-HTML signature
 * of a client-rendered page with no server API. So this check reads the
 * older Statuspage instance instead, since it is the only one with a real
 * API, while noting the newer page as a caveat rather than pretending it
 * does not exist.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — a different question from "is this credential
 *     live" (the derived `auth:*` check) or "is there balance left"
 *     (`quota`).
 *   - `scope: "app"` (the default for this kind) — identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — unauthenticated; reports
 *     even before anyone has connected.
 *   - `network.allow` — the status host is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist
 *     is widened for this hook only, permitted because the posture is
 *     unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
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

export const STATUS_HOST = "deepseek.statuspage.io";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

const service: HealthCheckDefinition = {
  key: "service",
  title: "DeepSeek platform status",
  description:
    "Atlassian Statuspage rollup for deepseek.statuspage.io, with per-component detail for the " +
    "API and web-chat services. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      if (!c.name || c.group) continue;
      components[slug(c.name)] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    return {
      state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
      message: body.status?.description,
      components,
      ttlSeconds: 300,
    };
  },
};

export default service;
