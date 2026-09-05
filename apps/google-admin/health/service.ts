/**
 * Is the vendor up? — the Google Workspace Status Dashboard.
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
 *   - `network.allow` — www.google.com is not one of the API hosts this app
 *     talks to, and an action has no business reaching it. Widening the
 *     allowlist for this one hook is permitted precisely because the posture is
 *     unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a Workspace incident
 *     never hard-fails a target on its own.
 *
 * The Admin SDK Directory API's own product surfaces in the dashboard as
 * "Admin Console" (verified 2026-09-05 against
 * https://www.google.com/appsstatus/dashboard/incidents.json — the User/Group/
 * Org Unit provisioning UI and this API share the same backend). Google
 * publishes an incident FEED rather than a current-state rollup, so "up" is
 * the absence of an open incident: an entry with no `end` is still running.
 * The feed covers all of Workspace, so it is filtered to Admin Console — a
 * Meet outage is not an Admin Console outage.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "www.google.com";
const SERVICE_NAME = "Admin Console";

/** Google's impact vocabulary, mapped onto our four states. */
const IMPACT: Record<string, HealthState> = {
  SERVICE_OUTAGE: "down",
  SERVICE_DISRUPTION: "degraded",
  SERVICE_INFORMATION: "ok",
};

interface Incident {
  service_name?: string;
  status_impact?: string;
  external_desc?: string;
  end?: string;
  uri?: string;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Google Admin Console platform status",
  description:
    "Open incidents for Admin Console (which the Directory API rides on) on the Google Workspace Status Dashboard. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/appsstatus/dashboard/incidents.json`);
    // `unknown`, never `down`: a dashboard that itself fails tells us nothing
    // about Google, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status dashboard returned ${res.status}` };

    const body = await res.json().catch(() => null) as Incident[] | null;
    if (!Array.isArray(body)) {
      return { state: "unknown", message: "status dashboard returned an unexpected shape" };
    }

    // No `end` means the incident is still running. The feed is history, so
    // everything else in it is already over.
    const open = body.filter((i) =>
      !i.end && (i.service_name ?? "").toLowerCase() === SERVICE_NAME.toLowerCase()
    );
    if (open.length === 0) return { state: "ok", ttlSeconds: 120 };

    return {
      state: worstHealthState(open.map((i) => IMPACT[i.status_impact ?? ""] ?? "degraded")),
      message: open.map((i) => i.external_desc).filter(Boolean).join("; ") || undefined,
      ttlSeconds: 120,
    };
  },
};

export default service;
