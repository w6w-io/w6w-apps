/**
 * Is AssemblyAI up? — Atlassian Statuspage.
 *
 * Verified live on 2026-08-29: `status.assemblyai.com/api/v2/summary.json` answers `200`
 * with the standard Statuspage document — `page.name: "AssemblyAI"`, `status.indicator`,
 * and a component tree including a top-level `APIs` group (`Asynchronous API`,
 * `Transcription Queue`, plus siblings) alongside infrastructure components (Container
 * Registry, etc). This is the same shape and rollup semantics as this pack's other
 * Statuspage-backed checks (e.g. `anthropic/health/service.ts`), mirrored here rather than
 * re-derived.
 *
 *   - `kind: "service"` answers "is the vendor's platform up" — different from "is this
 *     credential live" (the derived `auth:api-token` check) or "is there quota left"
 *     (`quota`, a declared absence here — see that file).
 *   - `scope: "app"` (default for this kind): the answer is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (default for this kind): no Connection required, reports even
 *     before anyone has connected.
 *   - `network.allow` widens egress for THIS hook only, to the status host — never the
 *     app's own allowlist, which an Action has no business reaching.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident never
 *     hard-fails a target on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/** Statuspage's four rollup indicators. `major`/`critical` map to `down`. */
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

export const STATUS_HOST = "status.assemblyai.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "AssemblyAI platform status",
  description: "Atlassian Statuspage rollup for status.assemblyai.com, with per-component " +
    "detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    // `unknown`, never `down`: a status page that itself fails tells us nothing about the
    // vendor, and reporting that as an outage would be a lie.
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `status API returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    } | null;
    if (!body?.status) return { state: "unknown", message: "status page returned no status body" };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      components[slug(c.name)] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    return {
      state: INDICATOR[body.status.indicator ?? ""] ?? "unknown",
      message: body.status.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
