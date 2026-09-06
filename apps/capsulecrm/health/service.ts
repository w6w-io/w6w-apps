/**
 * Is Capsule up? — Atlassian Statuspage.
 *
 * Verified live 2026-09-06: `https://status.capsulecrm.com/api/v2/summary.json`
 * returns `page.name: "Capsule"` (genuinely claimed, not the unclaimed-decoy
 * pattern this pack has found elsewhere) with exactly two components:
 * `"Capsule"` (the product as a whole, which is what this app's REST API rides
 * on top of — Capsule does not publish a separately-named API component) and
 * `"Drop Box"` (the inbound email-forwarding feature, unrelated to anything
 * this app calls). Only `"Capsule"` is reported.
 *
 * Annotation:
 *
 *   - `kind: "service"` — a different question from "is this credential live"
 *     (the derived `auth:*` check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (this kind's default) — one page, shared by every
 *     Connection.
 *   - `credential: "none"` (also the default) — unsigned, reports even before
 *     any Connection exists.
 *   - `network.allow` widens egress to the status host for this hook only;
 *     it is deliberately absent from the app's own `api.capsulecrm.com`
 *     allowlist.
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

const STATUS_HOST = "status.capsulecrm.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Capsule platform status",
  description:
    "Atlassian Statuspage rollup for status.capsulecrm.com. The page's single 'Capsule' " +
    "component is what this app's API rides on; the unrelated 'Drop Box' email feature is " +
    "ignored. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing about Capsule.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const capsule = body.components?.find((c) => c.name === "Capsule");
    const state = capsule
      ? (COMPONENT[capsule.status ?? ""] ?? "unknown")
      : (INDICATOR[body.status?.indicator ?? ""] ?? "unknown");

    return {
      state,
      message: body.status?.description,
      components: capsule ? { capsule: { state } } : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
