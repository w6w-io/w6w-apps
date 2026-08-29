/**
 * Is Salesloft up? — Atlassian Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", a
 *     different question from "is this credential live" (the derived
 *     `auth:*` check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical
 *     for every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.salesloft.com is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist
 *     is widened for this one hook only, which the spec permits precisely
 *     because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * `summary.json` rather than `status.json`: same single request, but it
 * carries the per-component breakdown. Verified live 2026-08-29:
 * status.salesloft.com serves the Statuspage v2 API with components
 * "Salesloft Web Application" (the core app/API), "VoIP Provider", "3rd Party
 * Integrations" and named third-party integrations (Salesforce, Hubspot,
 * Zoom, LinkedIn, MS Outlook, G-Suite Applications, Drift Chat/Email/Video,
 * Vidyard, Nylas, Conversation Intelligence, Deals, Salesloft Connect (Chrome
 * Extension)). Only "Salesloft Web Application" and "VoIP Provider" describe
 * Salesloft's own infrastructure; the rest are integration partners whose
 * outage does not mean Salesloft's API is down, so the check reports every
 * component but only "Salesloft Web Application" and "VoIP Provider" are
 * treated as authoritative for the overall state (the page-level indicator
 * already folds in the third-party rows, so it is not used for `state`).
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.salesloft.com";

/** Salesloft's own infrastructure, as distinct from third-party integrations it reports on. */
const CORE_COMPONENTS = new Set(["Salesloft Web Application", "VoIP Provider"]);

const service: HealthCheckDefinition = {
  key: "service",
  title: "Salesloft platform status",
  description:
    "Atlassian Statuspage rollup for status.salesloft.com, with per-component detail. Only the " +
    "Salesloft Web Application and VoIP Provider components (Salesloft's own infrastructure) " +
    "decide the reported state — the page also lists third-party integrations (Salesforce, " +
    "Zoom, LinkedIn, …) whose own outages are reported for visibility but do not mean the " +
    "Salesloft API itself is down. Unauthenticated and unsigned.",
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
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    const coreStates: HealthState[] = [];
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[slug(c.name)] = { state };
      if (CORE_COMPONENTS.has(c.name)) coreStates.push(state);
    }

    return {
      state: coreStates.length > 0 ? worstHealthState(coreStates) : "unknown",
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
