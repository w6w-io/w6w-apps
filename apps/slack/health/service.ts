/**
 * Is Slack up? — Slack runs its own status API rather than Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.slack.com is deliberately NOT on the app's egress
 *     allowlist (`slack.com` is the API host; the status host is a different
 *     name). The allowlist is widened for this one hook only, which the spec
 *     permits precisely because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a Slack incident never
 *     hard-fails a target on its own.
 *
 * Slack reports open incidents rather than a single rollup indicator, and each
 * incident names the surfaces it affects — so one call reports many components,
 * which is the point of a report over a boolean. A `notice` is Slack's label
 * for "we are telling you something", not "something is broken", so it does not
 * degrade the state.
 *
 * ## The headline is judged only by the surfaces we actually call
 *
 * Every Action under `actions/` is a Slack Web API call — the surface Slack
 * itself labels `Apps/Integrations/APIs` (`API_COMPONENT_IDS` below). An
 * incident naming only `Messaging` or `Workspace/Org Administration` does not
 * mean an app connected through the Web API is degraded, so the headline
 * `state` is `worstHealthState` over only the incidents that name one of our
 * surfaces (or name none at all — Slack's `services` field is sometimes
 * absent, and treating "unstated" as "not ours" would guess green in a case we
 * cannot actually rule out). `components` is untouched by this filter: it
 * still reports every surface every open incident names, because that per-
 * surface map is the detail view a studio panel renders, and filtering it
 * would trade one blind spot for another.
 *
 * This check also now publishes a structured `timeline` — one entry per open
 * incident, built straight from `active_incidents`, including incidents on
 * surfaces we do not use. `resolvedAt` is never set here: everything in
 * `active_incidents` is open by construction.
 */
import type { HealthCheckDefinition, HealthState, HealthTimelineEntry } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.slack.com";

/** Slack's incident types, worst-case mapped onto our four states. */
const TYPE: Record<string, HealthState> = {
  outage: "down",
  incident: "degraded",
  notice: "ok",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Vendor surfaces this App's Actions actually depend on. Every Action under
 * `actions/` is a Slack Web API call, which is the surface Slack labels
 * `Apps/Integrations/APIs` — the only member today, kept as a set (rather than
 * a single id, unlike `bigcommerce`/`productboard`'s `API_COMPONENT_ID`)
 * because the headline filter below generalizes the moment a second surface
 * needs to be added.
 */
export const API_COMPONENT_IDS: ReadonlySet<string> = new Set([slug("Apps/Integrations/APIs")]);

/** UTC ISO 8601, or `undefined` for a missing/unparseable date — never `"Invalid Date"`. */
function toUtcIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/** The live `/api/v2.0.0/current` shape — wider than the old `{ title?, type?, services? }`. */
interface ActiveIncident {
  id?: number;
  title?: string;
  type?: string;
  status?: string;
  url?: string;
  date_created?: string;
  date_updated?: string;
  services?: string[];
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Slack platform status",
  description:
    "Slack's own status API. Judges its headline state by the Apps/Integrations/APIs surface " +
    "this app's Actions depend on, reports every surface every open incident names, and " +
    "publishes a timeline of open incidents. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*", ...Array.from(API_COMPONENT_IDS, (id) => `component:${id}`)],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2.0.0/current`);
    // `unknown`, never `down`: a status API that itself fails tells us nothing
    // about Slack, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: string;
      active_incidents?: ActiveIncident[];
    };

    const incidents = body.active_incidents ?? [];
    if (incidents.length === 0) {
      // A positive statement that this check publishes history and there is
      // none right now — not the same thing as "we don't know".
      return { state: "ok", ttlSeconds: 60, timeline: [] };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const headlineStates: HealthState[] = [];
    const timeline: HealthTimelineEntry[] = [];

    for (const incident of incidents) {
      const state = TYPE[incident.type ?? ""] ?? "degraded";
      const services = incident.services ?? [];
      const slugs = services.map(slug);

      // An incident naming NO surfaces at all still counts toward the
      // headline: Slack's own field is simply absent, and we cannot tell that
      // it misses us. Guessing green here would be the same class of error as
      // the over-filtering this check exists to avoid, just pointed the other
      // way — silently healthy instead of falsely degraded.
      const affectsUs = services.length === 0 || slugs.some((s) => API_COMPONENT_IDS.has(s));
      if (affectsUs) headlineStates.push(state);

      for (const s of slugs) {
        // Worst incident wins per surface: two incidents can name the same one.
        const existing = components[s]?.state;
        components[s] = {
          state: existing ? worstHealthState([existing, state]) : state,
          message: incident.title,
        };
      }

      timeline.push({
        // The join key: byte-identical to the Atom feed's own `<id>` for the
        // same incident, so this is the one structural join across both
        // health checks' timelines.
        id: incident.url,
        title: incident.title ?? "",
        state,
        components: slugs,
        startedAt: toUtcIso(incident.date_created),
        updatedAt: toUtcIso(incident.date_updated),
        link: incident.url,
        // resolvedAt intentionally never set: everything in active_incidents
        // is open by construction, and absent is exactly what that means.
      });
    }

    return {
      state: worstHealthState(headlineStates),
      message: incidents.map((i) => i.title).filter(Boolean).join("; ") || undefined,
      components,
      ttlSeconds: 60,
      timeline,
    };
  },
};

export default service;
