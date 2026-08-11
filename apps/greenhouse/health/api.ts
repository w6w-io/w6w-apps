/**
 * Is the Harvest **v3** API answering, and are its routes still there?
 *
 * ## Why this check exists at all, when there is a status page
 *
 * Because this app is running against an API whose predecessor has a published
 * removal date. Greenhouse's v1/v2 reference carries the banner "The Harvest
 * v1/v2 API is deprecated and will be removed on August 31, 2026", and the token
 * exchange one of this app's two Auth methods depends on is documented as being
 * retired at the same moment. A status page reports incidents; it does not
 * report a planned removal, and it will read "All Systems Operational" on the
 * day an endpoint stops existing.
 *
 * ## What makes the probe load-bearing here
 *
 * Harvest **v3 routes before it authenticates**, and v1 does the opposite.
 * Measured unauthenticated on 2026-08-11:
 *
 *   | Request                              | Status | Body                                     |
 *   | ------------------------------------ | ------ | ---------------------------------------- |
 *   | `GET /v3/candidates`                 | 401    | `{"message":"Unauthorized","errors":["Token could not be decoded. …"]}` |
 *   | `GET /v3/definitely-not-real-zzz`    | 404    | `{"message":"Resource not found"}`       |
 *   | `GET /v1/candidates`                 | 401    | `{"message":"Invalid Basic Auth credentials"}` |
 *   | `GET /v1/definitely-not-real-zzz`    | 401    | `{"message":"Invalid Basic Auth credentials"}` |
 *
 * On v1 the auth gate runs first, so a nonsense path and a real one are
 * byte-identical and an unsigned probe can prove nothing about routing. On v3
 * they differ, which means an unauthenticated request to a documented path
 * distinguishes three states that matter: the route is alive (401), the route is
 * gone (404), or Greenhouse is not answering at all (5xx / no response).
 *
 * ## A 401 here is a PASS
 *
 * The probe deliberately carries no credential (`credential: "none"`), so a 401
 * is the *expected* answer and the strongest signal available: it proves DNS,
 * TLS, CloudFront, the Greenhouse router and the v3 authentication layer are all
 * working, and that the endpoint this app's actions call still exists. Whether
 * any particular credential is good is the derived `auth:*` checks' job.
 * Conflating the two is how "the endpoint was retired" gets misreported as
 * "your token expired".
 *
 * The body is checked as well as the status, because a 401 from a corporate
 * proxy or a CDN error page is not a 401 from Harvest. Only a JSON body carrying
 * Greenhouse's own `message` counts.
 *
 * ## Severity
 *
 * `kind: "dependency"`, left at the `degraded` default rather than raised to
 * `fatal`: this probe answering 404 is important enough to surface loudly but is
 * one endpoint's evidence, and the `service` check plus the credential checks
 * carry the rest of the picture.
 *
 * ## One cost worth stating
 *
 * v1 counts unauthenticated requests against a per-caller rate limit (an
 * unauthenticated `GET /v1/candidates` returned `x-ratelimit-remaining: 37` and
 * the next one 36, measured). v3 returned no `X-RateLimit-*` headers on its 401
 * at all, so the cost of this probe is unmeasurable from outside;
 * `minIntervalSeconds` keeps it to once a minute regardless.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * A documented v3 path, requested with no credential.
 *
 * `/v3/candidates` rather than a rarer resource on purpose: it is the endpoint
 * most workflows on this app will actually call, so its disappearance is the one
 * worth detecting first.
 */
export const PROBE_URL = `${API_BASE}${API_PREFIX}/candidates?per_page=1`;

const api: HealthCheckDefinition = {
  key: "api",
  title: "Harvest v3 API reachable",
  description:
    "Unauthenticated probe of GET /v3/candidates. A schema-correct 401 is a pass — it proves " +
    "the route exists and Greenhouse is answering. A 404 means the endpoint has been removed, " +
    "which is the failure a status page cannot report.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    } catch (error) {
      return {
        state: "down",
        message: `harvest.greenhouse.io did not answer: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }

    const body = await res.json().catch(() => null) as { message?: string } | null;
    const message = (body?.message ?? "").trim();

    if (res.status === 401) {
      // The expected answer, and the healthy one.
      return message ? { state: "ok", message: `v3 answering: ${message}`, ttlSeconds: 60 } : {
        state: "unknown",
        message:
          "401 with no Greenhouse error body — something in front of the API answered, not " +
          "Harvest itself",
      };
    }

    if (res.status === 404) {
      return {
        state: "down",
        message:
          "GET /v3/candidates answered 404 Resource not found. Harvest v3 routes before it " +
          "authenticates, so this means the endpoint no longer exists — not that a credential " +
          "is wrong. Check Greenhouse's changelog before anything else.",
      };
    }

    if (res.ok) {
      // Nothing documented should let an unauthenticated read succeed. If one
      // does, the probe has stopped proving that a credential is required.
      return {
        state: "unknown",
        message:
          `GET /v3/candidates answered ${res.status} with no credential attached, which the ` +
          "documented behaviour does not allow. This probe can no longer distinguish a live " +
          "route from an unauthenticated one.",
      };
    }

    if (res.status >= 500) {
      return { state: "down", message: `Harvest v3 returned HTTP ${res.status}` };
    }

    return {
      state: "unknown",
      message: `Harvest v3 returned HTTP ${res.status}${message ? `: ${message}` : ""}`,
    };
  },
};

export default api;
