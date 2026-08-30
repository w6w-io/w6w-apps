/**
 * Is Quo up? — Atlassian Statuspage.
 *
 * Verified live on 2026-08-30: `status.quo.com/api/v2/summary.json` answers `200` with the
 * standard Statuspage document — `page.name: "Quo"` (the page itself was rebranded from
 * "OpenPhone"), `status.indicator`, and a component list that mixes end-user surfaces (Android
 * App, iOS App, Mac App, Windows App, Web App, Website, Support) with the pieces that actually
 * matter for the API this app calls: `Quo API`, `Calling`, `Text Messaging`, `Infrastructure`,
 * `Voicemail`, `Integrations`. `status.openphone.com` redirects to the same page (confirmed via
 * `curl -L`), so only the current host is used.
 *
 *   - `kind: "service"` answers "is the vendor's platform up" — different from "is this
 *     credential live" (the derived `auth:api-key` check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (default for this kind): the answer is identical for every Connection.
 *   - `credential: "none"` (default for this kind): reports even before anyone has connected.
 *   - `network.allow` widens egress for THIS hook only, to the status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident never hard-fails a
 *     target on its own.
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

export const STATUS_HOST = "status.quo.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Quo platform status",
  description: "Atlassian Statuspage rollup for status.quo.com, with per-component detail. " +
    "Unauthenticated and unsigned.",
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
