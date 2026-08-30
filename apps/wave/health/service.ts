/**
 * Is Wave up? — Atlassian Statuspage at `status.waveapps.com`.
 *
 * Verified as the REAL, claimed page, not the common decoy shape: its own
 * `page.name` reads `"Wave"` and `page.url` reads
 * `"https://status.waveapps.com"`, with real component history and a
 * currently-scheduled maintenance window. The tempting alternative,
 * `wave.statuspage.io`, is the classic UNCLAIMED-Statuspage trap — its
 * `summary.json` names its components `"API (example)"` and `"Management
 * Portal (example)"`, Atlassian's own placeholder demo content, not Wave's.
 *
 * Annotation:
 *
 *   - `kind: "service"` — a different question from "is this credential live"
 *     (the derived `auth:*` checks) or "is there quota left" (not applicable
 *     here — see the README on why this app ships no `quota` check).
 *   - `scope: "app"` (this kind's default) — the rollup is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is required, so
 *     this reports even before anyone has connected.
 *   - `network.allow` — the status host is deliberately NOT on the app's
 *     runtime egress allowlist (only `gql.waveapps.com` is); the allowlist is
 *     widened for this one hook, which the spec permits precisely because the
 *     posture is unsigned.
 *   - `severity` is left at this kind's default, `degraded`. The rollup is
 *     account-wide and true for every Wave user equally, so demoting it to
 *     `informational` would hide a real, universal outage.
 *
 * `summary.json` rather than `status.json`: one request either way, but
 * summary carries the per-component breakdown (Web Application, Accounting,
 * Invoicing, Payments, Payroll, Receipts Processing, Mobile Application) —
 * one probe reporting several independent things, which is the point of a
 * report over a single boolean.
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

const STATUS_HOST = "status.waveapps.com";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Wave platform status",
  description:
    "Atlassian Statuspage rollup for status.waveapps.com, with per-component detail (Web Application, Accounting, Invoicing, Payments, Payroll, Receipts Processing, Mobile Application). Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us
    // nothing about Wave, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    // A 200 carrying the wrong document is not health. Statuspage always
    // sends `status.indicator`; an HTML catch-all or the unclaimed-page decoy
    // will not, and `INDICATOR[undefined] ?? "unknown"` would quietly report
    // `unknown` forever instead of saying the probe stopped working.
    if (typeof body.status?.indicator !== "string") {
      return { state: "unknown", message: "status API returned no rollup indicator" };
    }

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      if (!c.name || c.group) continue;
      components[slug(c.name)] = { state: COMPONENT[c.status ?? ""] ?? "unknown" };
    }

    return {
      state: INDICATOR[body.status.indicator] ?? "unknown",
      message: body.status.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
