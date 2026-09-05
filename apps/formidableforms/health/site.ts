/**
 * Is THIS connection's site reachable, and is the Formidable REST API v3
 * namespace actually registered on it?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — not `service`. There is no vendor platform in the
 *     request path: the customer's WordPress site IS the dependency, and its
 *     availability is a property of their infrastructure.
 *     `health/service.ts` says so explicitly rather than leaving a gap.
 *   - `scope: "connection"` — every Connection points at a different site, so
 *     there is no shareable app-wide answer.
 *   - `credential: "context"` — the check needs the Connection to know WHICH
 *     host to call, and needs no credential to interpret the answer. `sign`
 *     must not run.
 *   - No `network.allow` of its own: the site is already reachable under the
 *     app's `["*"]` allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind, which is right. The
 *     derived `auth:basic` check already covers a credential that has stopped
 *     working; this one exists to tell that apart from a site that is gone.
 *
 * The probe is `GET {site}/wp-json/` — WordPress' unauthenticated REST
 * discovery document. It is chosen over any `frm/v3` route because every one
 * of those is capability-gated, so an authenticated probe would conflate
 * "the site is down" with "this credential lacks a permission". The
 * discovery document separates three distinct failures:
 *
 *   1. transport failure / 5xx  -> the site is gone or broken
 *   2. 401/403/404 on the root  -> the WordPress REST API is disabled or a
 *                                  security plugin is blocking it
 *   3. 200 but `namespaces` has no `frm/v3` -> WordPress is fine, but
 *      Formidable's own `REST API` setting (Formidable -> Global Settings ->
 *      API) is switched off, or the Formidable API add-on isn't active
 *
 * (3) is the interesting one: the vendor's own reference says plainly "When
 * REST API is off, Formidable does not register the /frm/v2 or /frm/v3
 * routes" — and that failure mode is completely invisible to a plain
 * reachability check.
 *
 * The `namespaces` array is treated as advisory rather than authoritative — a
 * site can legitimately filter it — so its absence is reported as `ok`, and
 * only a present-but-missing entry is reported as `degraded`.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { normalizeSiteUrl, REST_NAMESPACE, WP_REST_ROOT } from "../lib/client.ts";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Site reachable",
  description: "Unauthenticated `GET /wp-json/` against this connection's site — proves the host " +
    "resolves, the WordPress REST API is enabled, and the `frm/v3` namespace is registered.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { siteUrl?: string };
    const siteUrl = normalizeSiteUrl(display.siteUrl ?? "");
    if (!siteUrl) return { state: "unknown", message: "connection records no site URL" };

    const res = await ctx.fetch(`${siteUrl}${WP_REST_ROOT}/`, {
      headers: { accept: "application/json" },
    });

    if (res.status >= 500) {
      return { state: "down", message: `site returned ${res.status}` };
    }
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      return {
        state: "down",
        message: `WordPress REST API disabled or blocked by a plugin (${res.status})`,
      };
    }
    if (!res.ok) {
      return { state: "degraded", message: `site returned ${res.status}`, ttlSeconds: 120 };
    }

    let body: { namespaces?: unknown };
    try {
      body = await res.json() as { namespaces?: unknown };
    } catch {
      return {
        state: "degraded",
        message: "REST discovery document was not valid JSON",
        ttlSeconds: 120,
      };
    }

    const namespaces = body?.namespaces;
    if (Array.isArray(namespaces) && !namespaces.includes(REST_NAMESPACE)) {
      return {
        state: "degraded",
        message: `site is up but the \`${REST_NAMESPACE}\` namespace is not registered — enable ` +
          "REST API at Formidable -> Global Settings -> API",
        ttlSeconds: 120,
      };
    }

    return { state: "ok", ttlSeconds: 120 };
  },
};

export default site;
