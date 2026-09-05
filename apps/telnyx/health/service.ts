import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Is Telnyx up? — Atlassian Statuspage at `status.telnyx.com`, confirmed
 * genuinely claimed (`page.name: "Telnyx"`, live incidents, not a
 * `statuspage.io`-hosted decoy) via `/api/v2/summary.json` on 2026-09-05.
 *
 * ## Components repeat with no way to tell the copies apart
 *
 * The page carries ~90 components, most of them per-region PoP names ("US",
 * "Europe", "APAC", ...) that repeat many times over. Two that matter more —
 * "API V1" and "API V2" — each appear **twice**, one instance `operational`
 * and the other `degraded_performance` at the moment this was checked, with
 * **no `group`/`group_id` field on any component in either
 * `/api/v2/summary.json` or `/api/v2/components.json`** to say which group
 * each copy belongs to. That's the same repeated-name shape other apps in
 * this pack resolve via `group_id` (e.g. Lever), except here the API gives
 * nothing to resolve it with — there is no messaging-specific component name
 * at all, so it cannot even be inferred from context.
 *
 * Given that, this check does NOT guess which "API" copy covers Messaging vs.
 * Voice vs. Numbers. It reports the PAGE-LEVEL indicator (what the vendor
 * itself considers the current overall state) as `state`, and additionally
 * names the two components below that this app's actions map to
 * **unambiguously** — each appears in the component list exactly once:
 *
 *   - `"Number Lookup API"` → `lookup-number`
 *   - `"Outbound Calling Services - United States"` / `"… - Canada"` →
 *     `make-call` / `hangup-call` (outbound only — this app never receives a
 *     call, so the matching "Inbound Calling Services" pair is not read)
 *
 * `send-message`, `get-message` and `list-phone-numbers` have no component of
 * their own to name, so for those the page-level `state` is the only signal
 * this check can give.
 *
 * Other annotation notes, same reasoning as the rest of this pack:
 *
 *   - `kind: "service"` / `scope: "app"` (default) — one shared answer, not
 *     per-Connection.
 *   - `credential: "none"` (default) — unauthenticated, reports before anyone
 *     has connected.
 *   - `network.allow` widens egress for this hook only; the app's own actions
 *     never call `status.telnyx.com`.
 *   - `severity` defaults to `degraded` for `kind: "service"`, so a vendor
 *     incident never hard-fails a target on its own.
 */
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

const STATUS_HOST = "status.telnyx.com";

/** Names verified to appear exactly once in `/api/v2/summary.json` (2026-09-05). */
const NAMED_COMPONENTS = [
  "Number Lookup API",
  "Outbound Calling Services - United States",
  "Outbound Calling Services - Canada",
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Telnyx platform status",
  description:
    "Atlassian Statuspage rollup for status.telnyx.com. Reports the page-level indicator plus " +
    "the two component names this app can attribute unambiguously (Number Lookup API, Outbound " +
    "Calling Services) — Messaging has no component of its own, and 'API V1'/'API V2' each repeat " +
    "twice with no group id to tell the copies apart. Unauthenticated and unsigned.",
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
      components?: Array<{ name?: string; status?: string }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      if (!c.name || !NAMED_COMPONENTS.includes(c.name)) continue;
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
