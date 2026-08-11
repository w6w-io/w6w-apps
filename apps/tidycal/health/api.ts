/**
 * Is the TidyCal API answering?
 *
 * TidyCal publishes no status page of any kind (see `health/service.ts`), so
 * reachability of the API itself is the only out-of-band signal that exists.
 * Annotation, and why each axis is set the way it is:
 *
 *   - `kind: "dependency"` — a different question from "is the credential live"
 *     (the derived `auth:*` checks) and from "is the vendor up" (nothing
 *     publishes that). This asks only whether the one origin the whole app runs
 *     on is serving its API router.
 *   - `scope: "app"` — `tidycal.com` is a single shared host with no per-tenant
 *     subdomain, so the answer is identical for every Connection and running it
 *     per-Connection would multiply one useful call by the number of users.
 *   - `credential: "none"` — `sign` must not run. An unsigned request cannot be
 *     metered against anyone's token, and a probe that consumes the very
 *     credential it is monitoring is a bad trade at any interval.
 *   - **No `network.allow`.** `tidycal.com` is already the app's own egress
 *     host; the spec forbids widening egress from a signed posture, and there
 *     is nothing to widen to here anyway.
 *
 * ## A 401 is the PASS, and the 404 is the interesting failure
 *
 * The probe carries no credential, so TidyCal rejects it — measured live on
 * 2026-08-11:
 *
 *     HTTP/2 401
 *     content-type: application/json
 *     {"message":"Unauthenticated."}          (30 bytes)
 *
 * That is the strongest evidence available that the service is healthy: DNS
 * resolved, TLS terminated, Cloudflare passed the request through, Laravel
 * routed it to the API controller and the auth middleware ran. Judging this
 * check by the HTTP status would report TidyCal as permanently down.
 *
 * The verdict is therefore taken from the response BODY and from one specific
 * alternative status. `tidycal.com` serves the marketing site, the public
 * booking pages and the API from **one origin**, and a path the API router does
 * not know falls through to the site's vanity-URL route:
 *
 *     GET /api/definitely-not-real  →  404
 *     {"message": "No query results for model [App\\Models\\User] api"}
 *
 * So a 404 here does not mean "endpoint moved", it means the API router is no
 * longer mounted at `/api` and every action in this app is dead — which is
 * exactly a `down`. An HTML body means an edge error page or a captive portal,
 * likewise `down`. A transport failure surfaces as the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";
import { PROBE_PATH, UNAUTHENTICATED_BODY } from "../auth/personal-token.ts";

/** `https://tidycal.com/api/me` — the cheapest route that proves the router is live. */
export const PROBE_URL = `${API_URL}${PROBE_PATH}`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "TidyCal API reachable",
  description:
    'Unauthenticated GET https://tidycal.com/api/me. A 401 {"message":"Unauthenticated."} ' +
    "passes — it proves the API router and auth middleware are serving. Credential validity is " +
    "the derived auth:* checks' job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text();

    let body: { message?: string } | null = null;
    try {
      body = JSON.parse(text) as { message?: string };
    } catch {
      return {
        state: "down",
        message: `tidycal.com/api returned a non-JSON body (HTTP ${res.status})`,
      };
    }

    if (res.status === 401) {
      // The expected reply to an unsigned probe. The API is up.
      return {
        state: "ok",
        message: body?.message === UNAUTHENTICATED_BODY ? undefined : body?.message,
        ttlSeconds: 120,
      };
    }

    if (res.status === 404) {
      return {
        state: "down",
        message: "tidycal.com/api/me 404s — the API router is no longer mounted at /api" +
          (body?.message ? ` (${body.message})` : ""),
      };
    }

    if (res.status >= 500) {
      return { state: "down", message: `tidycal.com returned HTTP ${res.status}` };
    }

    // Anything else — including an unexpected 200 to an unsigned read — is not
    // evidence of an outage, and this check will not invent one.
    return {
      state: "unknown",
      message: `unexpected HTTP ${res.status} from an unauthenticated /api/me`,
    };
  },
};

export default api;
