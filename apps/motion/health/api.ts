import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

/**
 * Is the Motion API answering?
 *
 * Motion's status page covers a single component named `Webapp`, it is
 * `not_monitored`, and there is no component for `api.usemotion.com` at all
 * (see `health/service.ts`). So the vendor publishes nothing about the one host
 * every action in this app talks to, and an unsigned request to that host is the
 * only out-of-band signal that exists.
 *
 * ## A 401 is the PASS
 *
 * The probe carries no credential, so Motion rejects it — measured live on
 * 2026-08-11:
 *
 *     HTTP/2 401
 *     content-type: application/json; charset=utf-8
 *     {"message":"Unauthorized","statusCode":401}        (43 bytes)
 *
 * That is the strongest evidence available that the service is healthy: DNS
 * resolved, TLS terminated, Cloudflare passed the request through, the API
 * routed it and its auth guard ran. Judging this check by the HTTP status would
 * report Motion as permanently down.
 *
 * ## …and a 404 is the interesting failure
 *
 * Motion's API is a NestJS app, and the router answers *before* the auth guard
 * for a path it does not recognise:
 *
 *     GET /v1/definitely-not-real-zzz  →  404
 *     {"message":"Cannot GET /v1/definitely-not-real-zzz","error":"Not Found","statusCode":404}
 *
 * So a 404 on `/v1/users/me` does not mean "wrong endpoint", it means the route
 * this app's auth probe depends on has been withdrawn — a `down`, and a
 * different problem from an outage. A non-JSON body means an edge error page or
 * a captive portal, likewise `down`. A transport failure surfaces as the hook
 * throwing.
 *
 * ## Annotation
 *
 *  - `kind: "dependency"` — deliberately not `service`. It proves *the API is
 *    answering us*, which is a narrower and weaker claim than "the vendor has
 *    declared itself healthy"; filing it as `service` would overstate what one
 *    request from one host can know.
 *  - `scope: "app"` — `api.usemotion.com` is a single shared host with no
 *    per-tenant subdomain, so the answer is identical for every Connection and
 *    running it per-Connection would multiply one useful call by the number of
 *    users.
 *  - `credential: "none"` — `sign` must not run. Motion allows **12 requests per
 *    minute** on the individual tier, so a probe that spent the very credential
 *    it monitors would be a meaningful fraction of a user's budget.
 *  - **No `network.allow`.** `api.usemotion.com` is already the app's own egress
 *    host; there is nothing to widen.
 */

/** `https://api.usemotion.com/v1/users/me` — the same route the auth probe uses, unsigned. */
export const PROBE_URL = `${API_BASE}${PROBE_PATH}`;

/** The exact body an unauthenticated Motion request returns. */
export const UNAUTHORIZED_MESSAGE = "Unauthorized";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Motion API reachable",
  description:
    'Unauthenticated GET https://api.usemotion.com/v1/users/me. A 401 {"message":"Unauthorized"} ' +
    "passes — it proves the router and the auth guard are serving. Credential validity is the " +
    "derived auth:* check's job, and Motion's status page covers no API component.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text();

    let body: { message?: string | string[] } | null = null;
    try {
      body = JSON.parse(text) as { message?: string | string[] };
    } catch {
      return {
        state: "down",
        message: `api.usemotion.com returned a non-JSON body (HTTP ${res.status})`,
      };
    }

    if (res.status === 401) {
      // The expected reply to an unsigned probe. The API is up.
      return {
        state: "ok",
        message: body?.message === UNAUTHORIZED_MESSAGE ? undefined : String(body?.message ?? ""),
        ttlSeconds: 120,
      };
    }

    if (res.status === 404) {
      return {
        state: "down",
        message: "GET /v1/users/me 404s — Motion's router no longer knows this route, so the " +
          "credential probe every Connection depends on has been withdrawn",
      };
    }

    if (res.status === 429) {
      // Throttling proves the API is answering; it just refuses to say more.
      return { state: "ok", message: "rate-limited (429) — the API is answering", ttlSeconds: 120 };
    }

    if (res.status >= 500) {
      return { state: "down", message: `api.usemotion.com returned HTTP ${res.status}` };
    }

    // Anything else — including an unexpected 200 to an unsigned read — is not
    // evidence of an outage, and this check will not invent one.
    return {
      state: "unknown",
      message: `unexpected HTTP ${res.status} from an unauthenticated /v1/users/me`,
    };
  },
};

export default api;
