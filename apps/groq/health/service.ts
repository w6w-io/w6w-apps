/**
 * Is GroqCloud up? — Atlassian Statuspage at groqstatus.com.
 *
 * `status.groq.com` 301-redirects here, and `groqstatus.com` itself is
 * confirmed live (its `/api/v2/summary.json` is a real Statuspage payload,
 * verified 2026-09-05).
 *
 * The unusual part: MOST of its ~20 components are per-MODEL
 * ("openai/gpt-oss-20b", "llama-3.3-70b-versatile", "whisper-large-v3", ...),
 * not per-endpoint — Groq is reporting inference-backend health per model
 * rather than a generic "Chat API" / "Audio API" split. There IS a plain
 * `API` component alongside a `Website` component, and those two are what
 * this check keys its top-level state on; the per-model entries still show
 * up in `components` (so a caller CAN see "is llama-3.3-70b-versatile
 * specifically down") but are not allowed to worsen the roll-up on their
 * own — a single degraded model is not the same claim as "the API is down".
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — a different question from "is this credential
 *     live" (the derived `auth:*` check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — unauthenticated; reports
 *     even before anyone has connected.
 *   - `network.allow` — groqstatus.com is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist
 *     is widened for this hook only, permitted because the posture is
 *     unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

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

export const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const STATUS_HOST = "groqstatus.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

// The two components that actually speak to "is the platform reachable",
// distinct from "is this one model's backend healthy right now".
const CORE_COMPONENTS = new Set(["api", "website"]);

const service: HealthCheckDefinition = {
  key: "service",
  title: "GroqCloud platform status",
  description:
    "Atlassian Statuspage rollup for groqstatus.com. Most components are per-model; only " +
    "`API` and `Website` feed this check's top-level state. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

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
    const coreStates: HealthState[] = [];
    for (const c of body.components ?? []) {
      if (!c.name || c.group) continue;
      const key = slug(c.name);
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[key] = { state };
      if (CORE_COMPONENTS.has(key)) coreStates.push(state);
    }

    // Fall back to the page-level indicator only if Groq ever drops the
    // named `API`/`Website` components — better a real (if coarser) answer
    // than `unknown` forever.
    const state = coreStates.length > 0
      ? worstHealthState(coreStates)
      : INDICATOR[body.status?.indicator ?? ""] ?? "unknown";

    return {
      state,
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
