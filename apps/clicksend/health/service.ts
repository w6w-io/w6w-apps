/**
 * Is ClickSend up? — Atlassian Statuspage.
 *
 * Verified live on 2026-08-24: `status.clicksend.com` (also reachable at
 * `clicksend.statuspage.io`) is a genuine, currently-updated Statuspage instance
 * — `page.name` reads "ClickSend Service Status" and its `components` list names
 * the actual product surfaces (`SMS`, `MMS`, `Voice`, `Fax`, `Email`, `Letters`,
 * `Postcards`) plus platform pieces (`REST API`, `HTTP API`, `SMPP`, `SMTP`,
 * `Online Dashboard`, `Webhooks`, `Email to SMS`, `Credit Card Payments`) grouped
 * under `Products` and `Services`/`Other`.
 *
 * `REST API` is the component that actually matters to this app (it is what
 * `network.allow` and every Action reach), so it drives the top-level `state`;
 * the messaging-channel components ClickSend also reports (`SMS`, `MMS`,
 * `Voice`, `Fax`, `Email`) are still surfaced per-component, since a channel
 * outage with the API itself healthy is a real, distinct failure mode for a
 * multi-channel app like this one.
 *
 * - `kind: "service"` / `scope: "app"` (both defaults) — the answer is identical
 *   for every Connection, so the host runs it once and shares the result.
 * - `credential: "none"` (default) — unauthenticated; reports even before
 *   anyone has connected.
 * - `network.allow` widens egress for this hook only. `status.clicksend.com` is
 *   deliberately NOT on the app's own `network.allow` — an Action has no
 *   business calling it, and this posture is unsigned so the widening is safe.
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

const STATUS_HOST = "status.clicksend.com";
/** The component name this app's own traffic actually depends on. */
const PRIMARY_COMPONENT = "rest api";

const service: HealthCheckDefinition = {
  key: "service",
  title: "ClickSend platform status",
  description: "Atlassian Statuspage rollup for status.clicksend.com, weighted on the REST API " +
    "component, with per-channel detail (SMS/MMS/Voice/Fax/Email). Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  credential: "none",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group_id?: string | null }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    let primaryState: HealthState | undefined;
    for (const c of body.components ?? []) {
      if (!c.name) continue;
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[slug(c.name)] = { state };
      if (c.name.trim().toLowerCase() === PRIMARY_COMPONENT) primaryState = state;
    }

    // Fall back to the page-wide indicator if the REST API component is ever
    // absent from a future reshuffle of the board — never fail closed on a
    // missing key.
    const state = primaryState ?? INDICATOR[body.status?.indicator ?? ""] ?? "unknown";

    return {
      state,
      message: body.status?.description,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
