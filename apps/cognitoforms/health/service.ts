/**
 * Is Cognito Forms up? — Atlassian Statuspage.
 *
 * Annotation:
 *
 *   - `kind: "service"` — a different question from "is this credential live" (the derived
 *     `auth:bearer-token` check) or "do we have quota left" (no `quota` check here — Cognito Forms
 *     publishes no rate-limit response headers of any kind on either a success or an error response,
 *     checked live 2026-08-30, so there is nothing real to read).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every Connection.
 *   - `credential: "none"` (also the default) — no Connection is required, so this reports even
 *     before anyone has connected.
 *   - `network.allow` widens egress to `status.cognitoforms.com` for this hook ONLY. That host is
 *     deliberately absent from the app's own egress allowlist — no Action has business calling it —
 *     and the spec permits the widening precisely because this posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident never hard-fails a
 *     target's health verdict on its own.
 *
 * Confirmed live 2026-08-30: `status.cognitoforms.com` is a real, populated Atlassian Statuspage
 * (page id `252qfz030rt5`) — not an unclaimed/decoy instance — with components including Website and
 * Forms, Email, and (per the vendor's own naming) the rest of the product surface.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** Statuspage's four rollup indicators. `major`/`critical` map to `down`; the roll-up caps the
 * reported severity at `degraded` anyway (this kind's default), so the distinction only matters to
 * an operator reading the raw state. */
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

const STATUS_HOST = "status.cognitoforms.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Cognito Forms platform status",
  description:
    "Atlassian Statuspage rollup for status.cognitoforms.com, with per-component detail. " +
    "Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing about the vendor,
    // and reporting that as an outage would be a lie.
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
