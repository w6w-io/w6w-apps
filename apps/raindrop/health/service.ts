import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Raindrop.io up? — a real **Better Stack** status page at
 * `status.raindrop.io`, verified four ways on 2026-08-11.
 *
 * ## It looks unclaimed, and it is not. That is the trap
 *
 * Every path on the host answers HTTP 200 with the same 511,148-byte HTML
 * document — including the Statuspage-shaped paths an integrator would try
 * first:
 *
 *   | Path                                   | Status | Bytes   | md5 (first 12) |
 *   | -------------------------------------- | ------ | ------- | -------------- |
 *   | `/api/v2/status.json`                  | 200    | 511,148 | `5591268ebd7d` |
 *   | `/api/v2/summary.json`                 | 200    | 511,148 | `5591268ebd7d` |
 *   | `/api/v2/definitely-not-real-zzz.json` | 200    | 511,148 | `5591268ebd7d` |
 *   | `/history.atom`                        | 200    | 511,148 | `5591268ebd7d` |
 *   | **`/index.json`**                      | 200    | 43,414  | `02fa64f39610` |
 *
 * Four byte-identical HTML answers to four different paths is the classic
 * unclaimed-host signature, and stopping there would have produced a declared
 * absence for a vendor that publishes a perfectly good machine-readable feed.
 * The cause is mundane: Raindrop's page is **Better Stack**, not Atlassian
 * Statuspage, so it has no `/api/v2/*` surface at all and `301`s every unknown
 * path to `/` (`location: https://status.raindrop.io/`, measured). The
 * catch-all is a redirect to a real page, not a parked domain.
 *
 * ## The four verifications
 *
 * **(a) A machine-readable endpoint exists and is distinguishable.**
 * `/index.json` is 43,414 bytes of JSON — a different size *and* a different
 * md5 from the HTML every other path returns.
 *
 * **(b) The page names this product.** Its own payload:
 *
 *     "company_name": "Raindrop.io",
 *     "company_url":  "https://raindrop.io",
 *     "custom_domain":"status.raindrop.io",
 *     "subdomain":    "raindrop"
 *
 * **(c) It has a component covering the API.** Five resources, live:
 * `Website`, **`API`**, `Web app`, `Search`, `Thumbnails`. A status page with no
 * API component would say nothing about this integration; this one names it
 * separately from the web app, which is exactly the granularity a caller of an
 * API integration needs.
 *
 * **(d) DNS resolves to the real vendor.** `status.raindrop.io` is a CNAME to
 * `statuspage.betteruptime.com`, and responses carry Better Stack's own
 * `report-uri https://in.logs.betterstack.com` headers.
 *
 * ## Why `index.json` and not the RSS feed
 *
 * `https://status.raindrop.io/feed.rss` is a genuine feed
 * (`application/rss+xml`, 9,391 bytes) that the spec's `feed:` declaration could
 * parse for free — and it is deliberately not used. Better Stack emits paired
 * `"API went down"` / `"API recovered"` items sharing one `<guid>`, so the
 * current state would have to be *inferred from title prose*. The pack's rule is
 * to read the vendor's own status field and never to invent one, and
 * `index.json` has that field twice over: `aggregate_state` for the roll-up and
 * a `status` per resource. One request either way, so the feed buys nothing but
 * guesswork.
 *
 * ## Annotation
 *
 *  - `kind: "service"` — is the vendor's platform up, a different question from
 *    "is this credential live" (the derived `auth:*` checks) and "is there quota
 *    left" (`quota`).
 *  - `scope: "app"` (this kind's default) — one host, one answer, shared by every
 *    Connection. Raindrop is SaaS-only; there is no self-hosted install whose
 *    health could differ.
 *  - `credential: "none"` (also the default, stated because it is the
 *    precondition for the egress widening below) — a status host must never see
 *    a Raindrop token.
 *  - `network.allow` — `status.raindrop.io` is deliberately absent from the app's
 *    own allowlist; no Action has business calling it.
 *  - `severity` is left at this kind's `degraded` default, so a vendor incident
 *    never hard-fails a target on its own.
 */

const STATUS_HOST = "status.raindrop.io";

export const STATUS_URL = `https://${STATUS_HOST}/index.json`;

/**
 * Better Stack's resource/aggregate vocabulary.
 *
 * `maintenance` maps to `degraded` rather than `down`: planned work is not an
 * outage, but it is not business as usual either. Anything unrecognised becomes
 * `unknown` rather than being optimistically read as healthy.
 */
export const STATE: Record<string, HealthState> = {
  operational: "ok",
  degraded: "degraded",
  downtime: "down",
  maintenance: "degraded",
};

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface StatusPayload {
  data?: {
    attributes?: {
      aggregate_state?: string;
      company_name?: string;
      custom_domain?: string;
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
 * Does this page still describe Raindrop.io?
 *
 * The failure mode this guards is a healthy, *claimed* status page that belongs
 * to someone else — a rebrand, a redirect, or a subdomain that changed hands.
 * `company_name` and `custom_domain` are the page's own self-identification, so
 * checking either is enough; both are accepted because Better Stack lets an
 * operator change the display name without changing the domain.
 */
export function identifiesRaindrop(
  attrs: { company_name?: string; custom_domain?: string } | undefined,
): boolean {
  const name = (attrs?.company_name ?? "").toLowerCase();
  const domain = (attrs?.custom_domain ?? "").toLowerCase();
  if (!name && !domain) return false;
  return name.includes("raindrop") || domain === STATUS_HOST;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Raindrop.io platform status",
  description:
    "Better Stack status page for status.raindrop.io: the aggregate state plus a state per " +
    "component (Website, API, Web app, Search, Thumbnails). Unauthenticated and unsigned.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails tells you nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    // The host serves HTML for anything it does not recognise, so a parse
    // failure here means the JSON endpoint moved — not that Raindrop is down.
    const body = await res.json().catch(() => null) as StatusPayload | null;
    if (!body) {
      return {
        state: "unknown",
        message: "status page did not return JSON — every unknown path on this host serves the " +
          "page's HTML, so index.json may have moved",
      };
    }

    const attrs = body.data?.attributes;
    if (!identifiesRaindrop(attrs)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Raindrop.io's",
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const entry of body.included ?? []) {
      if (entry.type !== "status_page_resource") continue;
      const name = entry.attributes?.public_name;
      if (!name) continue;
      // `explicit_status` is an operator override; it wins over the measured one.
      const raw = entry.attributes?.explicit_status ?? entry.attributes?.status ?? "";
      const state = STATE[raw] ?? "unknown";
      // The name goes in the message even when healthy: the key is a slug, and
      // a reader skimming a component list needs to see which one is which.
      components[slug(name)] = state === "ok" ? { state, message: name } : {
        state,
        message: `${name}: ${raw || "no status"}`,
      };
    }

    if (Object.keys(components).length === 0) {
      return { state: "unknown", message: "status page returned no components" };
    }

    // `aggregate_state` is Raindrop's own roll-up across all five resources and
    // is the field to trust. Deriving a verdict from the component list instead
    // would let a thumbnail renderer speak for the API.
    const aggregate = attrs?.aggregate_state;
    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");

    const notes: string[] = [];
    if (aggregate) notes.push(aggregate);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map(([, c]) => c.message).join(", ")}`);
    }

    return {
      state: STATE[aggregate ?? ""] ?? "unknown",
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
