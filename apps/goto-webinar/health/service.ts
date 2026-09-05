import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Is GoTo up? — Atlassian Statuspage, verified live 2026-09-05.
 *
 * `status.developer.goto.com` (the URL the GoTo developer portal itself links to) answers a
 * `302` redirect to `https://status.goto.com/` — verified with `curl -D -`. This check calls
 * the REDIRECT TARGET directly (`status.goto.com`), the URL actually confirmed working, rather
 * than the developer-portal link.
 *
 * `status.goto.com/api/v2/summary.json` is a real Atlassian Statuspage (`page.name`: "GoTo
 * Status Page") that lists per-product components, including one named exactly
 * **"GoTo Webinar API"** (distinct from "GoTo Webinar", the end-user product surface) — that
 * is the component this check tracks; the other ~70 components on that page (GoTo Connect,
 * Rescue, GoToMyPC, Grasshopper, …) are unrelated products sharing one status page and are
 * reported for context but do not affect `state`.
 *
 * Annotation, same reasoning this pack applies to every Statuspage-backed check:
 *
 *   - `kind: "service"` / `scope: "app"` (default) — one answer for every Connection.
 *   - `credential: "none"` (default) — reports even before anyone has connected.
 *   - `network.allow` widens egress for this hook only, to an UNSIGNED status host; a signed
 *     request must never reach it.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident never hard-fails
 *     a target on its own.
 */
const STATUS_HOST = "status.goto.com";
const WEBINAR_COMPONENT_NAME = "GoTo Webinar API";

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

const service: HealthCheckDefinition = {
  key: "service",
  title: "GoTo platform status",
  description:
    `Atlassian Statuspage rollup for ${STATUS_HOST}, tracking the "${WEBINAR_COMPONENT_NAME}" ` +
    "component. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  credential: "none",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing about GoTo.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    let webinarState: HealthState | undefined;
    for (const c of body.components ?? []) {
      if (!c.name || c.group) continue;
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[slug(c.name)] = { state };
      if (c.name === WEBINAR_COMPONENT_NAME) webinarState = state;
    }

    // Prefer the named component's own state over the page-wide rollup indicator: the rollup
    // reflects the WORST of ~70 unrelated products (Rescue, GoToMyPC, Grasshopper, …), and an
    // incident on one of those must not report GoToWebinar as degraded.
    const state = webinarState ?? INDICATOR[body.status?.indicator ?? ""] ?? "unknown";

    return {
      state,
      message: webinarState === undefined
        ? `"${WEBINAR_COMPONENT_NAME}" component not found in status feed; falling back to ` +
          "page-wide rollup"
        : body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
