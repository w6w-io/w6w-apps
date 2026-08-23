/**
 * Is SendGrid up? — Atlassian Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result. Running
 *     it per Connection would multiply one useful call by the number of users
 *     and is a good way to get rate-limited by a status page.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — the status host is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist is
 *     widened for this one hook only, which the spec permits precisely because
 *     the posture is unsigned: a signed request must never reach a third-party
 *     status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * `summary.json` rather than `status.json`: same single request, but it carries
 * the per-component breakdown — one probe reporting many things, which is the
 * point of a report over a boolean.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Statuspage's four rollup indicators. `major` is a major outage, so it maps to
 * `down` rather than `degraded` — the roll-up caps it at `degraded` anyway
 * (severity defaults to `degraded` for kind `service`), so the distinction is
 * purely what an operator sees.
 */
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

/**
 * The Statuspage-hosted subdomain, NOT SendGrid's own `status.sendgrid.com`
 * vanity domain. The vanity domain still resolves (a CNAME to
 * `3tgl2vf85cht.stspg-customer.com`) but SendGrid no longer has it configured on
 * the page: it serves a certificate valid only for `*.statuspage.io`, and
 * ignoring TLS it 302s to statuspage.io's marketing site. Verified 2026-08-23.
 *
 * The lesson generalises past this app — a vendor vanity domain in front of a
 * status page is a cert someone else has to remember to renew, so where the
 * canonical `<vendor>.statuspage.io` exists it is the more durable target.
 */
const STATUS_HOST = "sendgrid.statuspage.io";

const service: HealthCheckDefinition = {
  key: "service",
  title: "SendGrid platform status",
  description:
    "Atlassian Statuspage rollup for SendGrid, with per-component detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie. The
    // message says that in the reader's terms rather than echoing the vendor's
    // status code — `message` is rendered verbatim (rfcs/healthcheck.md rule 9),
    // and "status API returned 503" reads like our bug, not their outage.
    if (!res.ok) {
      ctx.log("warn", "SendGrid status page returned a non-2xx", { status: res.status });
      return { state: "unknown", message: "The status page could not be read." };
    }

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
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
