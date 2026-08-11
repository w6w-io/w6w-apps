/**
 * Is the Fireflies GraphQL API answering?
 *
 * With the status page dead (see `health/service.ts`), reachability of the API
 * itself is the only out-of-band signal there is. Annotation:
 *
 *   - `kind: "dependency"` — a different question from both "is the credential
 *     live" (the derived `auth:*` check) and "is the vendor up" (nothing
 *     publishes that). This asks only whether the one endpoint the whole app
 *     runs on is serving.
 *   - `scope: "app"` — there is a single shared host, `api.fireflies.ai`, with
 *     no per-tenant subdomain, so the answer is identical for every Connection
 *     and running it per-Connection would multiply one useful call by the
 *     number of users.
 *   - `credential: "none"` — `sign` must not run. Two reasons, and the second
 *     is the one that would bite: an unsigned request cannot be metered
 *     against anyone's key, and Fireflies' rate limit is as low as **50
 *     requests per day** on the Free plan (docs: `fundamentals/limits`). A
 *     signed probe on a five-minute interval would consume 288 requests a day
 *     — it would exhaust the plan it was monitoring.
 *   - No `network.allow` — `api.fireflies.ai` is already the app's own egress
 *     host, and the spec forbids widening egress from a signed posture anyway.
 *
 * **`auth_failed` is a PASS.** The probe carries no credential, so Fireflies
 * rejects it — with `HTTP 500` and a well-formed GraphQL envelope (measured
 * 2026-08-11):
 *
 * ```
 * HTTP/2 500
 * {"errors":[{"friendly":true,"code":"auth_failed","message":"An error occurred while
 *  authenticating your request...","extensions":{"code":"auth_failed"}}]}
 * ```
 *
 * That response is the strongest evidence available that the service is
 * healthy: DNS resolved, TLS terminated, Cloudflare passed the request
 * through, the GraphQL layer parsed it and the auth middleware ran. Judging
 * this check by the HTTP status would report Fireflies as permanently down.
 * The verdict is therefore taken from the response BODY: anything that parses
 * as a GraphQL envelope means the API is answering; only a body that is not
 * GraphQL at all (an edge error page, a captive portal, an HTML shell) is a
 * real failure — and a transport-level failure surfaces as the hook throwing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, errorCode, type FirefliesError, formatErrors } from "../lib/client.ts";

/** The smallest legal GraphQL document. It never executes — auth rejects first. */
const PROBE = "{ __typename }";

const api: HealthCheckDefinition = {
  key: "api",
  title: "GraphQL API reachable",
  description:
    "Unauthenticated POST to https://api.fireflies.ai/graphql. An `auth_failed` reply passes — " +
    "it proves the endpoint parsed the request and the auth layer ran. Credential validity is " +
    "the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query: PROBE }),
    });

    const text = await res.text();
    let payload: { data?: unknown; errors?: FirefliesError[] };
    try {
      payload = JSON.parse(text) as typeof payload;
    } catch {
      // Not the API: an HTML error page, an edge shell, a captive portal.
      return { state: "down", message: `endpoint returned a non-JSON body (HTTP ${res.status})` };
    }

    if (payload.errors?.length) {
      const codes = payload.errors.map(errorCode);
      // The expected reply to an unsigned probe. The API is up.
      if (codes.includes("auth_failed")) {
        return { state: "ok", message: "auth_failed — endpoint is serving", ttlSeconds: 120 };
      }
      // Some other GraphQL error still proves the GraphQL layer is running,
      // but it is not the answer we know how to interpret.
      return { state: "degraded", message: formatErrors(payload.errors), ttlSeconds: 120 };
    }

    // A JSON body with neither `data` nor `errors` is not a GraphQL response.
    if (payload.data === undefined) {
      return {
        state: "unknown",
        message: `JSON body carried neither data nor errors (HTTP ${res.status})`,
      };
    }
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default api;
