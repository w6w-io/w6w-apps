/**
 * Is SignRequest up? — Atlassian Statuspage, `signrequest.statuspage.io`.
 *
 * `kind: "service"`, `scope: "app"` (default — the answer is the same for every Connection),
 * `credential: "none"` (default — unsigned, runs before anyone has connected).
 *
 * ## The page is real, and that was checked rather than assumed
 *
 * `signrequest.com`'s own `<head>` embeds a Content-Security-Policy allowlisting
 * `https://62vqqh6qv58h.statuspage.io` — the exact page id below — as a script source, which is
 * how a vendor's own site typically embeds its status widget. Verified live 2026-09-05:
 *
 * ```
 * GET signrequest.statuspage.io/api/v2/summary.json -> 200 application/json
 *   page: { "id": "62vqqh6qv58h", "name": "SignRequest", "url": "https://signrequest.statuspage.io" }
 *   components (13): API, Web app, Workers, AWS cloudFront, AWS ec2-eu-west-1,
 *     AWS ec2-eu-central-1, AWS s3-eu-west-1, AWS route53, AWS elasticache-eu-west-1, …
 * ```
 *
 * A component literally named **API** exists. Only the AWS infrastructure components and `API`
 * itself are load-bearing for this app; `Web app`/`Workers` and the rest of the AWS list are the
 * browser UI and background processing, not this REST API, so they are read but capped at
 * `degraded` rather than allowed to report a full outage on their own.
 *
 * `network.allow` is widened for this hook only (unsigned posture); `signrequest.statuspage.io` is
 * not on the app's own egress allowlist because no action has any business calling it.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "signrequest.statuspage.io";
const API_COMPONENT = "api";

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

/** Statuspage's four rollup indicators — used only as a fallback. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** Components this app calls into, beyond the API itself. Capped at `degraded`, never `down`. */
const SECONDARY = new Set(["web app", "workers"]);

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Component {
  name?: string;
  status?: string;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "SignRequest platform status",
  description:
    "Atlassian Statuspage for signrequest.statuspage.io, narrowed to the API component (Web app / " +
    "Workers are read but capped at degraded). Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing about the vendor,
    // and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Component[];
    };
    const components = body.components ?? [];

    const api = components.find((c) => slug(c.name ?? "") === API_COMPONENT);
    if (!api) {
      const rollup = INDICATOR[body.status?.indicator ?? ""] ?? "unknown";
      return {
        state: rollup,
        message: body.status?.description ??
          "no API component found on signrequest.statuspage.io; reporting the page-wide rollup",
        ttlSeconds: 60,
      };
    }

    let state = COMPONENT[api.status ?? ""] ?? "unknown";
    const degraded: string[] = [];
    for (const c of components) {
      if (!SECONDARY.has((c.name ?? "").toLowerCase())) continue;
      const secondaryState = COMPONENT[c.status ?? ""] ?? "unknown";
      if (secondaryState === "ok" || secondaryState === "unknown") continue;
      degraded.push(`${c.name}: ${c.status}`);
      if (state === "ok") state = "degraded";
    }

    return {
      state,
      message: `API: ${api.status ?? "unknown"}` +
        (degraded.length > 0 ? ` · ${degraded.join(", ")}` : "") +
        (body.status?.description ? ` · page-wide: ${body.status.description}` : ""),
      components: { api: { state: COMPONENT[api.status ?? ""] ?? "unknown" } },
      ttlSeconds: 60,
    };
  },
};

export default service;
