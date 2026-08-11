import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Motion up? — a real **Better Stack** status page at `status.usemotion.com`
 * that says nothing whatsoever about `api.usemotion.com`.
 *
 * ## The page is real, and the first three paths you would try are not
 *
 * The host answers HTTP 200 with 149,492 bytes of HTML at `/`, which is the same
 * signature that made an earlier pass declare a *different* vendor undocumented.
 * Everything Statuspage-shaped is a `301` to `/`, so a redirect-following client
 * sees "200 OK, some HTML" and concludes nothing is published. Measured
 * 2026-08-11, without following redirects:
 *
 *   | path                        | status  | bytes   | content-type            |
 *   | --------------------------- | ------- | ------- | ----------------------- |
 *   | `/`                         | 200     | 149,492 | text/html               |
 *   | `/api/v2/status.json`       | **301** | 0       | → `/`                   |
 *   | `/api/v2/summary.json`      | **301** | 0       | → `/`                   |
 *   | `/history.atom`             | **301** | 0       | → `/`                   |
 *   | `/nope.json`, `/index.jsonx`| **301** | 0       | → `/`                   |
 *   | **`/index.json`**           | 200     | 3,773   | JSON:API payload        |
 *   | `/feed.rss`                 | 200     | 629     | application/rss+xml     |
 *
 * `/index.json` is Better Stack's own status-page endpoint and the only
 * machine-readable surface here. Its payload names this product —
 * `"company_name": "Motion"`, `"company_url": "https://usemotion.com"`,
 * `"custom_domain": "status.usemotion.com"` — and the page's HTML loads its
 * assets from `uptime.betterstack.com`, which is how the provider was
 * identified.
 *
 * `/feed.rss` is a genuine RSS document that the spec's `feed:` declaration
 * could parse for free, and it is not used: it is 629 bytes containing a channel
 * header and **zero `<item>` elements**. Motion has published no incident
 * through it, so it carries no state to read, while `/index.json` carries the
 * vendor's own `aggregate_state` field.
 *
 * ## Why this check is `informational`, which is the whole point
 *
 * The page has exactly **one** resource, and it is not the API:
 *
 *     "public_name": "Webapp",
 *     "status":      "not_monitored"
 *
 * So two things are true at once. There is no component covering
 * `api.usemotion.com` — every action in this app talks to a host this page does
 * not describe. And the single component it *does* describe reports
 * `not_monitored`, meaning Better Stack has no monitor attached to it, so the
 * page-level `aggregate_state: "operational"` is a roll-up over nothing.
 *
 * A `service` check defaults to `severity: "degraded"`, which would let that
 * evidence-free roll-up move a verdict about the API. It is pinned to
 * `informational` instead: the reading is published because it is what the
 * vendor says, and it is barred from worsening anything because it is not about
 * the surface this app uses. `health/api.ts` is the check that actually probes
 * `api.usemotion.com`.
 *
 * The check is still a live probe rather than a declared absence, because the
 * page is real and the day Motion attaches a monitor — or adds an API component
 * — this starts producing signal with no code change. {@link ALL_UNMONITORED}
 * is what keeps the current state honest in the meantime: every resource
 * unmonitored reports `unknown`, never `ok`.
 *
 * ## Annotation
 *
 *  - `kind: "service"` / `scope: "app"` — one host, one answer, shared by every
 *    Connection. Motion is SaaS-only; there is no self-hosted install.
 *  - `credential: "none"` — stated explicitly because it is the precondition for
 *    the egress widening below. A status host must never see a Motion API key.
 *  - `network.allow` — `status.usemotion.com` is deliberately absent from the
 *    app's own allowlist; no Action has business calling it. Redirects are not
 *    followed by the allowlist, which is another reason to name the exact path
 *    that answers rather than one that 301s.
 */

const STATUS_HOST = "status.usemotion.com";

export const STATUS_URL = `https://${STATUS_HOST}/index.json`;

/**
 * Better Stack's resource/aggregate vocabulary, taken from the page's own
 * `<symbol id='icon-…'>` set: `operational`, `degraded`, `downtime`,
 * `maintenance`, `not_monitored`.
 *
 * `maintenance` is `degraded`, not `down` — planned work is not an outage but is
 * not business as usual. `not_monitored` is `unknown`, not `ok`: "nobody is
 * watching this" is the absence of evidence, and reading it as healthy is
 * exactly the mistake this whole check exists to avoid.
 */
export const STATE: Record<string, HealthState> = {
  operational: "ok",
  degraded: "degraded",
  downtime: "down",
  maintenance: "degraded",
  not_monitored: "unknown",
};

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface StatusPayload {
  data?: {
    attributes?: {
      aggregate_state?: string;
      company_name?: string;
      company_url?: string;
      custom_domain?: string;
    };
    relationships?: {
      status_reports?: { data?: unknown[] };
    };
  };
  included?: Array<{
    type?: string;
    attributes?: {
      public_name?: string;
      status?: string;
      explicit_status?: string | null;
    };
  }>;
}

/**
 * Does this page still describe Motion?
 *
 * The failure mode guarded here is a healthy, *claimed* status page belonging to
 * someone else after a rebrand or a subdomain changing hands. `company_name` and
 * `custom_domain` are the page's own self-identification; either is enough,
 * because Better Stack lets an operator change the display name without changing
 * the domain.
 */
export function identifiesMotion(
  attrs: { company_name?: string; custom_domain?: string } | undefined,
): boolean {
  const name = (attrs?.company_name ?? "").toLowerCase();
  const domain = (attrs?.custom_domain ?? "").toLowerCase();
  if (!name && !domain) return false;
  return name.includes("motion") || domain === STATUS_HOST;
}

/**
 * Is every resource on the page unmonitored?
 *
 * When it is — which is the state measured on 2026-08-11, with the sole
 * `Webapp` resource at `not_monitored` — `aggregate_state` is a roll-up over an
 * empty set and must not be reported as `ok`.
 */
export const ALL_UNMONITORED = "every component on the status page is not_monitored";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Motion platform status",
  description:
    "Better Stack status page at status.usemotion.com/index.json. Informational only: the page " +
    "carries a single component, `Webapp`, and no component covering api.usemotion.com — see " +
    "the `api` check for the API itself.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails tells you nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    // Every unknown path on this host 301s to the HTML page, so a parse failure
    // means index.json moved — not that Motion is down.
    const body = await res.json().catch(() => null) as StatusPayload | null;
    if (!body) {
      return {
        state: "unknown",
        message: "status page did not return JSON — every unrecognised path on this host " +
          "redirects to the HTML page, so index.json may have moved",
      };
    }

    const attrs = body.data?.attributes;
    if (!identifiesMotion(attrs)) {
      return { state: "unknown", message: "status page no longer self-identifies as Motion's" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const entry of body.included ?? []) {
      if (entry.type !== "status_page_resource") continue;
      const name = entry.attributes?.public_name;
      if (!name) continue;
      // `explicit_status` is an operator override and wins over the measured one.
      const raw = entry.attributes?.explicit_status ?? entry.attributes?.status ?? "";
      const state = STATE[raw] ?? "unknown";
      // The name goes in the message even when healthy: the key is a slug, and a
      // reader skimming a component list needs to see which one is which.
      components[slug(name)] = state === "ok"
        ? { state, message: name }
        : { state, message: `${name}: ${raw || "no status"}` };
    }

    if (Object.keys(components).length === 0) {
      return { state: "unknown", message: "status page returned no components" };
    }

    // Counted, not read: the `status_reports` array was EMPTY when this was
    // measured, so the shape of an entry is unverified. Counting the
    // relationship needs no field beyond the one observed, and inventing an
    // incident schema from nothing is how a check starts reporting confident
    // nonsense.
    const reports = body.data?.relationships?.status_reports?.data?.length ?? 0;

    const aggregate = attrs?.aggregate_state;
    const monitored = Object.values(components).filter((c) => c.state !== "unknown");
    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");

    let state: HealthState = STATE[aggregate ?? ""] ?? "unknown";
    const notes: string[] = [];
    if (aggregate) notes.push(aggregate);

    if (monitored.length === 0) {
      // The measured case. `aggregate_state: "operational"` over zero monitored
      // resources is not evidence, and `ok` would present it as if it were.
      state = "unknown";
      notes.push(ALL_UNMONITORED);
    }
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map(([, c]) => c.message).join(", ")}`);
    }
    if (reports > 0) {
      // A published report is worth surfacing even though its contents are not
      // read; `degraded` rather than `down` because nothing here says how severe
      // it is.
      if (state === "ok" || state === "unknown") state = "degraded";
      notes.push(`${reports} status report(s) published — see https://${STATUS_HOST}`);
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
