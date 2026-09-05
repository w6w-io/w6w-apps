/**
 * Is Insightly up? — Atlassian Statuspage.
 *
 * Verified live 2026-09-05: `https://status.insightly.com/api/v2/summary.json`
 * returns `page.name: "Insightly"` (not a decoy) with exactly two components,
 * `"Insightly Web App"` and `"Insightly API"` — the latter is what this app's
 * actions actually depend on, so its state is reported by name rather than
 * folded anonymously into the page rollup.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — a different question from "is this credential live"
 *     (the derived `auth:*` check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — the page is identical for every
 *     Connection regardless of which pod it's on; Insightly's status page is
 *     not region-suffixed the way JumpCloud's is.
 *   - `credential: "none"` (also the default) — unsigned, reports even before
 *     any Connection exists.
 *   - `network.allow` widens egress to the status host for this hook only; an
 *     Action has no business calling it, and it is deliberately absent from
 *     the app's own `*.insightly.com` allowlist.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
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

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.insightly.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Insightly platform status",
  description:
    "Atlassian Statuspage rollup for status.insightly.com, with per-component detail — the " +
    "'Insightly API' component is the one this app's actions depend on. Unauthenticated and " +
    "unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Insightly.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      page?: { name?: string };
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
      ttlSeconds: 60,
    };
  },
};

export default service;
